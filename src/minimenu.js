/**
 * @license
 * Copyright (C) 2013 Steven Berry (http://www.sberry.me/minimenu)
 * Licensed: MIT (http://opensource.org/licenses/mit-license.php)
 */
(function(root, factory) {
	if (typeof module === 'object' && module && typeof module.exports === 'object') {
		factory.call(root, require('jquery'));
	}
	else if (typeof define === 'function' && define.amd) {
		define(['jquery'], function() {
			return factory.apply(root, arguments);
		});
	}
	else if (typeof root === 'object' && root && typeof root.document === 'object') {
		factory.call(root, root.jQuery);
	}
})(this, function($, undefined) {
	var window = this;
	var document = window.document;

	var uid = 0;
	var activeId;
	var menus = {};

	var INVALID_CLASS = 'mm-invalid';
	var MENU_CLASS = 'mm-anchor';


	function hideActive(e) {
		var menu;

		if (activeId) {
			menu = menus[activeId];

			$(menu.element).hide();

			menu.onClose.call(menu.element, e, menu, menu.target);
			menu.reset();

			activeId = null;
		}
	}


	function ContextMenu(args) {
		var event, hasIcon, i, id, item, items, $anchor, $item;

		args = args || {};

		id = 'mm-anchor-' + (++uid);
		items = args.items || args.options || [{ text: 'Close' }];

		// Create the context menu DOM object and set the class and ID.
		// Node: The class of "construct" is used so that menu items have a display style of inline.
		// This allows for calculating the "true" width and keeping track of how wide the absolutely positioned element should be.
		// After the menu object is fully constructed, this temporary class is removed.
		$anchor = $('<div class="mm-anchor"></div>').attr('id', id);
		$(document.body).append($anchor);

		for (i = 0; i < items.length; i++) {
			item = items[i];
			event = item.event;

			// Create the item DOM element and set its event if applicable.
			$item = $('<div><div><div></div></div><div></div></div>');

			if (typeof event === 'string') {
				$item.data('event', event);
				$item.addClass('mm-' + event);
			}

			if (item.iconClass || item.iconCSS) {
				hasIcon = true;

				$item.children().eq(0).children().eq(0)
					.attr('class', item.iconClass)
					.css(item.iconCss || {});
			}

			$item.children().eq(1)
				.html(item.text)
				.attr('class', item.textClass)
				.css(item.textCss || {})
				.css('white-space', 'nowrap');

			$anchor.append($item);
		}

		$anchor.hide();

		// Set the object values and return the object.
		this.id = id;
		this.element = $anchor[0];

		if ($.isFunction(args.onOpen)) {
			this.onOpen = args.onOpen;
		}

		if ($.isFunction(args.onClose)) {
			this.onClose = args.onClose;
		}
	}

	// Define the return type prototype methods.
	ContextMenu.prototype = {
		onClose: $.noop,
		onOpen: $.noop,
		
		options: function(listString) {
			return this.items(listString);
		},
		
		items: function(listString) {
			var selector, $items;

			$items = $(this.element).find('> div');
			selector = $.map($.trim(listString).split(/\s+/g), function(d) {
				if (d.length > 0) {
					return '.mm-' + d;
				}
			}).join(',');

			return selector ? $items.filter(selector) : $items;
		},

		invalidate: function(listString, message) {
			return this.items(listString).addClass('mm-invalid').attr('title', message);
		},

		reset: function(listString) {
			return this.items(listString).removeClass('mm-invalid').removeAttr('title');
		},

		hook: function(dir, fn) {
			if (!$.isFunction(fn)) {
				throw new TypeError('Argument `fn` must be a function');
			}

			if (dir === 'pre') {
				this.onOpen = fn;
			}
			else if (dir === 'post') {
				this.onClose = fn;
			}

			return this;
		},

		unhook: function(dir) {
			if (arguments.length === 0) {
				this.onClose = $.noop;
				this.onOpen = $.noop;
			}
			else if (dir === 'pre') {
				this.onOpen = $.noop;
			}
			else if (dir === 'post') {
				this.onClose = $.noop;
			}

			return this;
		}
	};


	// Hide active menu when the window object is clicked or the window loses focus.
	$(window).on('click blur', hideActive);

	// Prevent selection on context menu items.
	// Ideally this would be handled via the CSS user-select property,
	// but browser support is spotty right now. Keep an eye on this.
	$(document).on('selectstart', '.' + MENU_CLASS, function(e) {
		e.preventDefault();

		return false;
	});


	// jQuery object extension function to handle creating a context menu.
	// The syntax for the call is identical to .delegate() except the arguments structure is
	// substituted for .delegate()'s required callback function.
	$.fn.minimenu = function(events, selector, args) {
		var context, menu, $menuElement;

		context = this.selector || document;
		menu = new ContextMenu(args);
		menus[menu.id] = menu;
		$menuElement = $(menu.element);

		function showMenu(e) {
			e.preventDefault();
			hideActive(e);

			activeId = menu.id;
			menu.target = e.currentTarget;
			menu.onOpen.call(menu.element, e, menu, menu.target);

			$menuElement.css({
				'top': e.pageY - 5,
				'left': e.pageX - 5
			}).show();
		}

		$(context).on(events, selector, showMenu);

		$menuElement.on('click.minimodal', '> div', function(e) {
			var event, $this = $(this);

			e.stopPropagation(); // Don't click through to the document/window.

			// Don't allow clicks on invalid elements.
			if (!$this.hasClass(INVALID_CLASS)) {
				hideActive(e);

				if (event = $this.data('event')) {
					$(menu.target).trigger(event);
				}
			}
		});

		menu.unload = function() {
			$menuElement.off('.minimodal');
			$(context).off(events, selector, showMenu);

			$menuElement.remove();
			delete menus[menu.id];
		};

		return menu;
	};


	return {
		menus: menus
	};
});