/*
 * Run.js
 *
 * An HTML presentation framework for busy people.
 * 
 * Dependancies
 *      JQuery
 *      Marked (https://github.com/chjj/marked)
 *      Highlight.js (https://github.com/isagalaev/highlight.js)
 *      Mousetrap (http://craig.is/killing/mice)
 *
 * HTML OVERVIEW:
 * <slides>
 *      <slide wrapper>
 *          <slide>
 *             Contnet
 *         </slide>
 *     </slide wrapper>
 *     ...
 * </slides>
  * <controls wrapper>
 *     <left arrow />
 *     <menu />
 *     <right arrow />
 * </controls wrapper>
 * <progress wrapper>
 *     <progress bar />
 * </progress wrapper>
 * <toc modal>
 *     <toc list>
 *         <a />
 *         ...
 *     </toc list>
 * </toc modal>
 * <toc curtain />
 */

var Run = new (function (){

    'use strict';

    // The this keyword can be ambiguous within method calls, so let's fix that right now
    var self = this;

    // Disables keyboard commands when slides are transitioning
    self.animating = false;

    // Disables commands when TOC is open
    self.toc_open = false;

    // The data URL for the markdown
    self.data_url = "data.md";

    // The slide deck
    self.slides = [];

    // The index of the current slide within the slide deck
    self.current_slide = 0;

    // The template for a new slide
    self.new_slide_prototype = {
        // An string of the slide title
        title: "",
        // An HTML string of the slide content
        content: ""
    };

    // Abstraction to parse markdown (in case we want to change underlying library later)
    self.parse_markdown = function (markdown){

        return marked(markdown, {
            gfm: true,
            highlight: function (code, lang) {
                return hljs.highlightAuto(code, lang).value;
            },
            tables: true,
            breaks: true
        });

    };

    // Returns a fresh slide template
    self.new_slide_template = function (){

        return Object.create(self.new_slide_prototype);

    };

    // A function to create a new slide
    self.create_new_slide = function (properties){

        // Create slide with template prototype - to make sure that pushed slide retains all properties
        var slide = self.new_slide_template();

        // Pass any arguments to slide
        for (var property_key in properties) {
            if (properties.hasOwnProperty(property_key)) {
                slide[property_key] = properties[property_key];
            }
        }

        // Add to slide deck
        self.slides.push(slide);

        // Return index of pushed slide
        return self.slides.length - 1;

    };

    // The generic go to slide command
    self.go_to_slide = function (index){

        // Validate that slide is within the slide deck
        if (
            (index >= 0) &&
            (index < self.slides.length)
        ){
            self.animate_slide_transition(self.current_slide, index);
            self.current_slide = index;
            self.render();
        }

    };

    // Advance a slide
    self.next_slide = function (){

        self.go_to_slide(self.current_slide + 1);

    };

    // Go back a slide
    self.previous_slide = function (){

        self.go_to_slide(self.current_slide - 1);

    };

    // Animates transition between slides
    self.animate_slide_transition = function (from, to){

        // disable keyboard actions
        self.animating = true;

        // If trying to go to current slide, do nothing
        if (from === to){
            return;
        }

        // Determine whether moving forward or back
        var moving_forward = (to > from);

        // Gather the DOM elements
        var $from_wrapper = $(".current_slide_wrapper");
        var $to_wrapper = self.add_slide(to);

        var $from_slide = $from_wrapper.children(".slide");
        var $to_slide = $to_wrapper.children(".slide");

        // Position correctly
        $to_wrapper.addClass( (moving_forward ? "next_slide_wrapper" : "previous_slide_wrapper") );

        // Shrink each slide
        $to_slide.addClass("slide_tile");
        $from_slide.addClass("slide_tile");

        // When done shrinking move slides
        $from_slide.on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function (e){

            if ($from_slide.is(e.target)){

                $from_slide.off('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');

                // Set each wrapper to animate movement
                $to_wrapper.addClass("moving_slide_wrapper");
                $from_wrapper.addClass("moving_slide_wrapper");

                // Change positions of slides
                $to_wrapper
                    .removeClass( (moving_forward ? "next_slide_wrapper" : "previous_slide_wrapper") )
                    .addClass('current_slide_wrapper');
                $from_wrapper
                    .removeClass('current_slide_wrapper')
                    .addClass( (moving_forward ? "previous_slide_wrapper" : "next_slide_wrapper") );

                // When done moving, remove the movement class, unshrink, and delete old slide
                $from_wrapper.on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function (e){

                    if ($from_wrapper.is(e.target)){

                        $from_wrapper.off('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');

                        $from_wrapper.remove();

                        $to_wrapper.removeClass("moving_slide_wrapper");
                        $to_slide.removeClass("slide_tile");

                        // When done growing to full size
                        $to_slide.on('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function (){

                            // Reenable actions
                            self.animating = false;     

                        });



                    }

                });

            }

        });

    };

    // Add a slide to the DOM
    self.add_slide = function (index){

        // Create the slide
        var $slide = $("<div class='slide'></div>");
        $slide.html("<h1>" + self.slides[index].title + "</h1>" + self.slides[index].content);

        // Wrap the slide
        var $slide_wrapper = $("<div class='slide_wrapper'></div>");    
        $slide_wrapper.append($slide);

        // Render the slide (wrapper)
        $(".slides").append($slide_wrapper);

        // Return the slide (wrapper)
        return $slide_wrapper;

    };

    // Removes a slide from the DOM
    self.remove_slide = function ($slide_wrapper){

        $slide_wrapper.remove();

    };

    // Renders progress bar
    self.render_progress = function (){

        var percent_completed = ((self.current_slide + 1) / self.slides.length) * 100;

        $(".progress_bar").css("width", percent_completed + "%");

    };

    // Renders controls
    self.render_controls = function (){

        // Determine which way the user can move
        var can_go_previous = (self.current_slide > 0);
        var can_go_next = (self.current_slide < (self.slides.length - 1));

        // Select elements
        var $next_arrow = $(".right_arrow");
        var $previous_arrow = $(".left_arrow");

        // Remove previous state
        $next_arrow.addClass("disabled_control");
        $previous_arrow.addClass("disabled_control");

        // Remove state if can proceed
        if (can_go_next){
            $next_arrow.removeClass("disabled_control");
        }
        if (can_go_previous){
            $previous_arrow.removeClass("disabled_control");
        }

    };

    // Render the TOC
    self.render_toc = function (){

        // Get the actual TOC
        var $toc = $(".toc_list");

        // Clear the list
        $toc.html("");

        // Add a link for all the slides
        for (var i = 0; i < self.slides.length; i++){

            // Create the item
            var $item = $("<li><a href='#'>" + self.slides[i].title + "</a></li>");

            // Bind the event handler
            $item.on("click", (function (slide){

                return function (){

                    self.go_to_slide(slide);

                };

            })(i));

            // Bold the item if it is the current slide
            if (i == self.current_slide){
                $item.addClass("toc_current_slide");
            }

            // Add the item to the TOC
            $toc.append($item);

        }

    };

    // Renders the whole wrapper (everything except the slide)
    self.render = function (){

        self.render_controls();
        self.render_progress();
        self.render_toc();

    };

    // Adds elements; also does keybinding
    self.init = function (){

        // Add the first slide
        var first_slide = self.add_slide(0);
        first_slide.addClass("current_slide_wrapper");

        // Do the keybinding
        for (var i = 0; i < self.keyboard_bindings.length; i++){

            (function (callback){

                // Bind to custom handler in case we want to filter / only conditionally invoke the command
                Mousetrap.bind(self.keyboard_bindings[i].bindings, function (){
                    self.handle_command(callback)
                });

                // Also bind the button
                $(self.keyboard_bindings[i].button).on('click', function (){
                    self.handle_command(callback)
                });

            })(self.keyboard_bindings[i].callback);

        }

        // Render
        self.render();

    };

    // Parses the markdown into slides
    self.parse_slides = function (markdown){

        // define a title line
        var title_pattern = /^#([^#]|$)/;
        var strip_from_title = /^#\s?/g;

        // parse the lines
        var lines = markdown.split("\n");

        // create temp slide
        var slide = undefined;

        // iterate thru lines
        for (var i = 0; i < lines.length; i++){

            // create handle for easier access
            var line = lines[i];

            // see if title 
            if (title_pattern.test(line)){

                // send old slide off to be parsed
                if (typeof(slide) !== "undefined"){

                    self.parse_slide(slide);

                }

                // begin new slide and set as title
                slide = self.new_slide_template();
                slide.title = line.replace(strip_from_title, "");

            }
            // if not title simply append to existing slide
            else {

                // Make sure slide actually exists
                if (typeof(slide) !== "undefined"){

                    slide.content += line + "\n";

                }

            }

        }

        // send final slide off to be parsed 
        if (typeof(slide) !== "undefined"){

            self.parse_slide(slide);

        }

        // Add the first slide
        self.init();

    };

    // Parses a slide from markdown
    self.parse_slide = function (slide){

        slide.content = self.parse_markdown(slide.content);

        self.create_new_slide(slide);

    };

    // Request data to turn into presentation
    self.request_data = function (){

        $.ajax({
            dataType: "text",
            type: "GET",
            url: self.data_url,
            success: self.parse_slides
        });

    };

    // Open the TOC
    self.open_toc = function (){

        // Make sure the TOC isn't already open
        if (!self.toc_open){

            self.toc_open = true;

            $(".toc_modal").slideDown();
            $(".toc_curtain").fadeIn();

        }

    };

    // Close the TOC
    self.close_toc = function (){

        // Make sure the TOC is closed
        if (self.toc_open){

            $(".toc_modal").slideUp();
            $(".toc_curtain").fadeOut();

            self.toc_open = false;

        }

    };

    self.handle_command = function (callback){

        if (!self.animating){

            callback();

        }

    };

    // Toggles the fullscreen
    self.toggle_fullscreen = function (){

        if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
            self.activate_fullscreen();
        } 
        else {
            self.deactivate_fullscreen();
        }

    };

    // Activates fullscreen
    self.activate_fullscreen = function (){

        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } 
        else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        }
        else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }

    };

    // Deactives fullscreen
    self.deactivate_fullscreen = function (){

        if (document.cancelFullScreen) {
            document.cancelFullScreen();
        }
        else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } 
        else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }

    };

    // List of keyboard bindings - defined down here because callbacks aren't yet defined (as not hoisted)
    self.keyboard_bindings = [
        {
            bindings: ["right", "enter", "space"],
            button: ".right_arrow",
            callback: self.next_slide
        },
        {
            bindings: ["left"],
            button: ".left_arrow",
            callback: self.previous_slide
        },
        {
            bindings: ["down"],
            button: ".menu",
            callback: self.open_toc
        },
        {
            bindings: ["up", "esc"],
            button: ".toc_close, .toc_curtain",
            callback: self.close_toc
        },
        {
            bindings: ["shift"],
            callback: self.toggle_fullscreen
        }
    ];

    // establish self call
    $(document).ready(function (){
        self.request_data();
    });

})();