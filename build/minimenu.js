/* Copyright (C) 2013 Steven Berry (http://www.sberry.me/projects/minimenu)
 * Licensed: http://opensource.org/licenses/mit-license.php
 * License Stipulations:
 *     1) Retain this comment block.
 *     2) Send me an email if you use this and have questions/comments!
 * 
 * Steven Berry
 * www.sberry.me
 * steven@sberry.me
 */

(function(window, $, undefined) {
	// Establish a static reference to the true HTML document.
	var document = window.document;
	// Initialize internal ID counter for instantiating multiple context menus.
	var uid = 0;
	// Keep a referenced list of created menus and the id of the "active menu."
	// This allows streamlined access to any specified post-hooks and it ensures:
	//     1) One menu is closed at a time
	//     2) Bugs affecting styling options are squashed
	//     3) Opening a "new" context menu will close the old one. This has to do with the event order (FIXME).
	var menus = {};
	var activeId;
	
	// Create the function to handle hiding the active context menu.
	// This function serves as a modular segment in case this logic needs to be extended.
	// The DOM element itself is hidden and the post-hook (if applicable) is executed.
	var hideActive = function(e) {
		if (activeId) {
			var menu = menus[activeId];
			$(menu.el).hide();
			menu.hooks.post(e);
			activeId = null;
		}
	};
	
	// Establish internal event handler to to close the active context menu.
	// If a click is not on a context menu or the window loses focus, all context menus will close.
	// Hence clicks on menu options run e.stopPropagation()
	$(window).bind('click blur', hideActive);
	
	// Prevent selection on context menu items.
	// Ideally this would be handled via the CSS user-select property,
	// but browser support is spotty right now. Keep an eye on this.
	$(document).delegate('div.mm-anchor', 'selectstart', function(e) {
		e.preventDefault();
		return false;
	});
	
	// Define plugin's return type for interacting with already-created context menus.
	// This follows the jQuery pattern of initialization, but is separated from the jQuery
	// extension scope. This is because each context menu is more or less an enhanced DOM object.
	// I don't want functions like "hook" that are plugin specific to pollute the jQuery scope.
	// TODO: Look into whether or not there's a cleaner way to accomplish this.
	var contextmenu = function(selector, context, events, args) {
		return new contextmenu.fn.init(selector, context, events, args);
	};
	
	// Define the return type prototype methods.
	contextmenu.fn = contextmenu.prototype = {
		// Create the context menu DOM object, references and properties,
		// insert it into the document body, and return the instantiated menu object.
		init: function(selector, context, events, args) {
			var
				iconFlag = false,
				id = 'mm-anchor-' + (++uid),
				itemEvents = [],
				minWidth = 0,
				options = args.options;
			var callback, event, iconPadding, iconSize, iconUrl, offset, width, $anchor, $item;			
			
			// Load optional values.
			iconSize = args.iconSize || 20;
			iconPadding = args.iconPadding || 4;
			offset = iconSize + 2 * iconPadding;
			
			// Create the context menu DOM object and set the class and ID.
			// Node: The class of "construct" is used so that menu items have a display style of inline.
			// This allows for calculating the "true" width and keeping track of how wide the absolutely positioned element should be.
			// After the menu object is fully constructed, this temporary class is removed.
			$anchor = $('<div></div>').attr('id', id).addClass('mm-anchor construct');
			$(document.body).append($anchor);
			
			for (var i = 0; i < options.length; i++) {			
				// Create the item DOM element and set its event if applicable.
				$item = $('<div></div>').html(options[i].text);
				if (typeof (event = options[i].event) === 'string') {
					$item[0].event = event;
					$item.addClass('mm-' + event);
				}
				
				// Does the option hav an icon?
				// If so set the background image, ajust the option height and set the icon flag to true.
				if (typeof (iconUrl = options[i].icon) === 'string') {
					$item.css({
						'background-image': 'url(\'' + iconUrl + '\')',
						'height': args.itemHeight || offset
					}).css(options[i].style || {});
					iconFlag = true;
				}
				
				$anchor.append($item);
				
				// Keep track of the widest option element.
				width = $item.outerWidth();
				minWidth = (width > minWidth) ? width : minWidth;
				
				// If an individual callback is specified for the option, bind it here.
				callback = options[i].callback;
				if ($.isFunction(callback)) {
					itemEvents.push(event);
					$(context).delegate(selector, event, callback);
				}
			}
			
			// The actual width of the context menu element needs to be as wide as its widest child.
			width = minWidth;
			// Ajust the option text positioning to accomodate icons (if applicable).
			if (iconFlag) {
				width += offset;
				$anchor.find('> div').css({
					'padding-left': offset + 2,
					'background-size': iconSize,
					'background-position': iconPadding + 'px center'
				});
			}
			
			// Initialize the visibility and width and remove the temporary construct class.
			$anchor.hide().css('width', width + 6).removeClass('construct');
			
			// Set the object values and return the object.
			this.id = id;
			this.el = $anchor[0];
			this.selector = selector;
			this.context = context;
			this.events = events;
			this.itemEvents = itemEvents;
			this.hooks = {};
			this.hooks.pre = this.hooks.post = $.noop;
			
			return this;
		},
		
		// Set either the pre-hook or the post-hook.
		
		// The pre-hook is intended to check the interface for any conditions that might modify the context menu
		// (i.e. disabling items based on the class of the clicked DOM element). As such, the pre-hook will run
		// with the clicked DOM element as the context and can be cleanly referenced with "this."
		
		// The post-hook is intended to reset the context menu after a valid option is clicked. As such, the
		// post-hook will run with the menu DOM element as the context.
		
		// In both cases the context menu associated with the spawn event is passed through as an extension to the
		// event arguments and is accessible with e.currentMenu.
		hook: function(end, callback) {
			var currentMenu = menus[this.id];
			
			if (end === 'pre') {
				this.hooks.pre = function(e) {
					e.currentMenu = currentMenu;
					callback.call(e.currentTarget, e);
				};
			}
			else if (end === 'post') {
				this.hooks.post = function(e) {
					e.currentMenu = currentMenu;
					callback.call(currentMenu.el, e);
				};
			}
			
			return this;
		},
		
		// Clear either the pre-hook, the post-hook, or both
		unhook: function(end) {
			if (end === 'pre' || end === 'post') {
				this.hooks[end] = $.noop;
			}
			else if (typeof end === 'undefined') {
				this.hooks.pre = this.hooks.post = $.noop;
			}
			
			return this;
		},
		
		// An abstraction to find the options associated with a given menu based.
		// This is included so you don't need to inspect the inherent, automatic structure to
		// manually run .find(). The function itself functions exactly as .find() would but is
		// DOM agnostic.
		options: function(selector) {
			var $options = $(this.el).find('> div');
			return (typeof selector === 'undefined') ? $options : $options.filter(selector);
		},
		
		// Function to "get rid" of a spawned context menu. Undue (?) care is taken to clear any attached
		// delegates/event-listeners before the element is removed from the DOM and cut off.
		unload: function() {
			var
				context = this.context,
				selector = this.selector,
				itemEvents = this.itemEvents || [];
				
			$(context).undelegate(selector, this.events);
			for (var i = 0; i < itemEvents.length; i++) {
				$(context).undelegate(selector, itemEvents[i]);
			}
			
			$(this.el).remove();
			
			// Note: this does NOT delete the context menu per se, but it should clear all internal
			// references and increase the probability of a GC catch. Unless a third-party pointer
			// was created and maintained elsewhere.
			delete menus[this.id];
		}
	};
	
	// jQuery object extension function to handle creating a context menu.
	// The syntax for the call is identical to .delegate() except the arguments structure is
	// substituted for .delegate()'s required callback function.
	$.fn.minimenu = function(selector, events, args) {
		var 
			context = this.selector || document,
			invalidClass = args.invalidClass || 'mm-invalid',
			menu = contextmenu(selector, context, events, args);
		menus[menu.id] = menu;
		
		// Create a delegate to spawn a context menu based on provided condition parameters.
		$(context).delegate(selector, events, function(e) {
			e.preventDefault(); // Prevent the default context menu window.
			e.stopPropagation(); // Don't click through to the document/window.
			
			hideActive(e);
			// Run the menu's pre-hook processor.
			menu.hooks.pre(e);
			
			// Create a reference to DOM element that initiated the context menu event.
			menu.target = e.currentTarget;	
			$(menu.el).css({
				'top': e.pageY - 5,
				'left': e.pageX - 5
			}).show();
			
			// Create a reference to the active context menu for handling close events, etc.
			activeId = menu.id;
		});
		
		// Create a delegate to handle context menu option clicks.
		// Specified event names are fired on the DOM element that initiated the context menu.
		$(menu.el).delegate('> div', 'click', function(e) {
			e.stopPropagation(); // Don't click through to the document/window.
			
			if (!$(this).hasClass(invalidClass)) { // Don't allow clicks on invalid elements.
				hideActive(e);
				
				if (!!this.event) {
					$(menu.target).trigger(this.event);
				}
			}
		});
		
		return menu;
	};
	
	// Create a reference to select internal objects in the Global scope.
	contextmenu.prototype.init.prototype = contextmenu.prototype;
	window.minimenus = menus;
})(window, jQuery);