/**
 * Created by shaynegui on 2015/3/19.
 */
(function (window) {
	'use strict';

	var mouseEvents = 'mouseup mousedown mousemove mouseout',
		touchEvents = 'touchstart touchmove touchend touchcancel';


	var _holdTimer,
		_isTouchStart,
		_isStartSwiping,
		_startTime,
		_pos = {}

	var config = {
		tapMaxDistance: 10,
		swipeMinDistance: 18,
		swipeMinTime: 300,
		holdMinTime: 650
	};


	var utils = {
		hasTouch: 'ontouchstart' in window,
		getAngle: function (pos1, pos2) {
			//因为Y轴是向下为正值,因此计算数学上的角度应该是pos1在前面,类似本来应该是第四象限结果成了第一象限
			return Math.atan2(pos1.y - pos2.y, pos2.x - pos1.x) * 180 / Math.PI;
		},
		getDistance: function (pos1, pos2) {
			var x = pos2.x - pos1.x,
				y = pos2.y - pos1.y;
			return Math.sqrt((x * x) + (y * y));
		},
		getDirectionByAngle: function (angle) {
			var direction
			if (angle <= 45 && angle > -45) {
				direction = "right"
			}
			else if (angle <= 135 && angle > 45) {
				direction = "up"
			}
			else if (angle > 135 || angle <= -135) {
				direction = "left"
			}
			else if (angle <= -45 && angle > -135) {
				direction = "down"
			}

			return direction
		},
		isTouchMove: function (event) {
			return event.type === "touchmove" || event.type === "mousemove"
		},
		isTouchEnd: function (event) {
			return event.type === "touchend" || event.type === "touchcancel" || event.type === "mouseup"
		},
		isFunction: function (obj) {//
			return obj && obj !== undefined && obj.call && obj.apply
		}
	}

	var bindingEvents = utils.hasTouch ? touchEvents : mouseEvents;

	var gesture = {
		hold: function (event) {

			var distance = utils.getDistance(_pos.start, _pos.move ? _pos.move : _pos.start);


			_holdTimer = setTimeout(function () {

				if (distance < config.tapMaxDistance) {

					touch.trigger(event.target, "hold", {
						type: 'hold',
						originEvent: event
					})
				}
			}, config.holdMinTime)


		},
		tap: function (event) {
			var touchTime = Date.now() - _startTime,
				distance = utils.getDistance(_pos.start, _pos.move ? _pos.move : _pos.start)

			clearTimeout(_holdTimer)
			if (distance < config.tapMaxDistance && touchTime < config.holdMinTime) {
				touch.trigger(event.target, "tap", {
					type: 'tap',
					originEvent: event
				});
				event.preventDefault()//阻止后面的鼠标事件和默认行为,防止ghost click点击击穿问题
			}

		},
		swipe: function (event) {
			var touchTime = Date.now() - _startTime,
				angle = utils.getAngle(_pos.start, _pos.move),
				direction = utils.getDirectionByAngle(angle),
				distance = utils.getDistance(_pos.start, _pos.move)
			var eventObj = {
				type: "swipe",
				originEvent: event
			}

			var swipeTo = function () {
				switch (direction) {
					case "up":
						touch.trigger(event.target, "swipeup", eventObj)
						break;
					case "down":
						touch.trigger(event.target, "swipedown", eventObj)
						break;
					case "left":
						touch.trigger(event.target, "swipeleft", eventObj)
						break;
					case "right":
						touch.trigger(event.target, "swiperight", eventObj)
						break;
				}
			}

			clearTimeout(_holdTimer)

			if (!_isStartSwiping) {
				_isStartSwiping = true

			}
			else if (utils.isTouchMove(event)) {
				//保证swipe自定义事件只执行一次,避免多次触发浪费性能,滑动距离要得到
				if (touchTime > config.swipeMinTime && touchTime < config.swipeMinTime + 50 && distance > config.swipeMinDistance)
					swipeTo()
			}
			else if (utils.isTouchEnd(event) || event.type === 'mouseout') {
				if (touchTime < config.swipeMinTime && distance > config.swipeMinDistance) {
					swipeTo()
				}
			}

		}
	}

	var touch = {
		on: function (selector, eventtype, handler) {
			var el = typeof selector === "string" ? document.querySelector(selector) : selector
			var eventTypes = eventtype.split(" ")
			el.listeners = el.listeners || {}
			eventTypes.forEach(function (type) {
				if (!el.listeners[type]) {
					el.listeners[type] = [handler]
				}
				else {
					el.listeners[type].push(handler)
				}
				el.addEventListener(type, handler, false)
			})

		},
		off: function (selector, eventtype, handler) {
			var el = typeof selector === "string" ? document.querySelector(selector) : selector
			if (!handler) {
				var handlers = el.listeners[eventtype]
				if (handlers && handlers.length > 0) {
					handlers.forEach(function (handler) {
						el.removeEventListener(eventtype, handler, false)
					})

				}
			}
			else {
				el.removeEventListener(eventtype, handler, false)
			}
		},
		trigger: function (el, eventType, detail) {
			detail = detail || {}
			var event, opt = {
				bubbles: true,
				cancelable: true,
				detail: detail
			}

			try {
				if (utils.isFunction(CustomEvent)) {
					event = new CustomEvent(eventType, opt)
				}
				else {
					event = document.createEvent("CustomEvent")
					event.initCustomEvent(eventType, true, true, detail)
				}
				el && el.dispatchEvent(event)
			}
			catch (ex) {
				console.warn("Touch is not supported by environment.");
			}

		},
		onStart: function (event) {

			_isTouchStart = true
			_startTime = Date.now()
			if (!_pos.start) {
				_pos.start = this.getCoords(event)
			}

			gesture.hold(event)


		},
		onMove: function (event) {
			if (_isTouchStart && _pos.start) {
				_pos.move = this.getCoords(event)
				gesture.swipe(event)

			}
		}
		,
		onEnd: function (event) {
			if (_isTouchStart) {
				_isTouchStart = false;
				if (_isStartSwiping) {
					gesture.swipe(event)
				}
				else {
					gesture.tap(event)
				}

				this.reset();
			}
		},
		getCoords: function (event) {
			var touch;
			if (/touch/.test(event.type)) {//如果是touch事件从touch对象取
				touch = event.changedTouches[0]
			}
			else {
				touch = event
			}

			return {
				x: touch.pageX,
				y: touch.pageY
			}
		},
		handleEvent: function (e) {
			switch (e.type) {
				case "touchstart":
				case "mousedown":
					this.onStart(e)
					break;
				case "touchmove":
				case "mousemove":
					this.onMove(e)
					break;
				case "touchend":
				case "touchcancel":
				case "mouseup":
				case "mouseout":
					this.onEnd(e)
					break;
			}
		},
		reset: function () {
			_isTouchStart = _isStartSwiping = false;
			_pos = {}
		}
	}


	bindingEvents.split(" ").forEach(function (event) {
		document.addEventListener(event, touch, false);
	});

	window.touch = touch

})(window)
