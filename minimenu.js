// Copyright (C) 2013 Steven Berry (http://www.sberry.me/projects/minimenu)
// Licensed: http://opensource.org/licenses/mit-license.php

(function(window, $, undefined) {
	var document = window.document;
	var anchorId = 0;
	
	$(window).bind('click blur', function(e) {
		$('div.mm-anchor').hide();
	});
	
	$.fn.minimenu = function(args) {
		var id, $anchor, $item, width, icopad = false, minwidth = 0;
		if (typeof args === 'undefined' || typeof args.length === 'undefined') {
			throw 'Illegal arguments.';
		}
		
		id = 'mm-anchor-' + (++anchorId);
		$anchor = $('<div></div>').attr('id', id).addClass('mm-anchor construct');
		$(document.body).append($anchor);
		
		for (var i = 0; i < args.length; i++) {			
			$item = $('<div></div>').html(args[i].text);
			if (typeof args[i].event === 'string') {
				$item.data('event', args[i].event);
			}
			
			if (typeof args[i].icon === 'string') {
				$item.css('background-image', 'url(\'' + args[i].icon + '\')');
				icopad = true;
			}
			
			$anchor.append($item);
			
			width = $item.width();
			minwidth = (width > minwidth) ? width : minwidth;
			
			if ($.isFunction(args[i].callback)) {
				$(args[i].context || document).delegate(this.selector, $item.data('event'), args[i].callback);
			}
		}
		
		width = minwidth + 12;
		if (icopad) {
			width += 20;
			$anchor.addClass('icons');
		}
		
		$anchor.hide().css('width', width + 'px').removeClass('construct');
		
		$anchor.delegate('> div', 'click', function(e) {
			e.stopPropagation();
			
			$('div.mm-anchor').hide();
			var event = $(this).data('event');
			if (!!event) {
				$($anchor.target).trigger(event);
			}
		});
		
		$(document).delegate(this.selector, 'contextmenu', function(e) {
			e.preventDefault();
			
			$('div.mm-anchor').hide();
			$anchor.target = e.currentTarget;	
			$anchor.css({
				'top': e.pageY + 'px',
				'left': e.pageX + 'px'
			}).show();
		});
	};
})(window, jQuery);