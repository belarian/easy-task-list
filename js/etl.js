(function() {
	"use strict";

	// checks for global objects
	if (typeof window.localforage == "undefined") {
		console.error("The Object 'localforage' is not available!\n"
			+ "More info: https://localforage.github.io/localForage/");
		return;
	}
	if (typeof window.jQuery == "undefined") {
		console.error("The Object 'jQuery' is not available!");
		return;
	}
	if (typeof window.Sortable == "undefined") {
		console.error("The Object 'Sortable' is not available!\n"
			+ "More info: https://github.com/RubaXa/Sortable");
		return;
	}
	if (typeof window.Mustache == "undefined") {
		console.error("The Object 'Mustache' is not available!\n"
			+ "More info: https://github.com/janl/mustache.js");
		return;
	}
	if (typeof window.docCookies == "undefined") {
		console.error("The Object 'DocCookies' is not available!\n"
			+ "More info: https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie/Simple_document.cookie_framework");
		return;
	}

	// asigning global objects to local scope
	var localforage = window.localforage,
		$ = window.jQuery,
		Sortable = window.Sortable,
		Mustache = window.Mustache,
		DocCookies = window.docCookies,
		document = window.document,
		navigator= window.navigator;

	/** @constructor Event - Singelton wrapper */
	var Event = new function() {
		/** @private Object */
		var list = {};
		/**
		 * @param String handler name
		 * @param Element element
		 *
		 * @return this (Event)
		 */
		this.on = function(handlerName, element) {
			var handler = list[handlerName];

			if (typeof handler == "undefined") {
				console.error("There is no event handler with a name: " + handlerName);
				return this;
			}

			if (handler.type == "event") {
				element.addEventListener(handler.event, handler.fn, handler.useCapture);
			} else if (handler.type == "observer") {
				handler.observer.observe(element, handler.config);
			}
			return this;
		};
		/**
		 * @param String handlerName
		 * @param Element element
		 *
		 * @return this (Event)
		 */
		this.off = function(handlerName, element) {
			var handler = list[handlerName];

			if (typeof handler == "undefined") {
				console.error("There is no event handler with a name: " + handlerName);
				return this;
			}

			if (handler.type == "event") {
				element.removeEventHandler(handler.event, handler.fn, handler.useCapture);
			} else if (handler.type == "observer") {
				handler.observer.disconect();
			}
			return this;
		},
		/**
		 * @param String handlerName
		 * @param String event
		 * @param Function fn
		 * @param boolean useCapture
		 *
		 * @return this (Event)
		 */
		this.registerHandler = function(handlerName, event, fn, useCapture) {
			useCapture = useCapture || false;
			list[handlerName] = {
				type: "event",
				event: event,
				fn: fn,
				useCapture: useCapture
			};
			return this;
		},
		/**
		 * @param String observerName
		 * @param Object config
		 * @param Function fn
		 *
		 * @return this (Event)
		 */
		this.registerObserver = function(observerName, config, fn) {
			var MutationObserver = window.MutationObserver
				|| window.WebKitMutationObserver
				|| window.MozMutationObserver;

			list[observerName] = {
				type: "observer",
				config: config,
				observer: new MutationObserver(fn)
			};
			return this;
		},
		/**
		 * @param String handlerName
		 */
		this.unregisterHandler = function(handlerName) {
			delete list[handlerName];
		},
		/**
		 * @param String observerName
		 */
		this.unregisterObserver = function(observerName) {
			delete list[observerName];
		},
		/**
		 * @param String handlerName
		 *
		 * @return Object registered handler
		 */
		 this.get = function(handlerName) {
			return list[handlerName];
		 }
	};

	/** @constructor Helper */
	var Helper = function() {
		/**
		 * @return Integer
		 */
		function getDocumentHeight() {
			return Math.max(
				document.body.scrollHeight, document.documentElement.scrollHeight,
				document.body.offsetHeight, document.documentElement.offsetHeight,
				document.body.clientHeight, document.documentElement.clientHeight
			);
		}

		function setDocumentHeight() {
			document.body.style["height"] = getDocumentHeight() + "px";
		}

		function unsetDocumentHeight() {
			document.body.style["height"] = "";
		}

		/**
		 * @param Element element
		 * @param String html
		 * @return Element
		 */
		function appendHtml(element, html) {
			var temp = document.createElement("DIV");
			temp.innerHTML = html;
			element.appendChild(temp.firstElementChild);
			return element.lastElementChild;
		}

		/**
		 * @param String str
		 * @return String
		 */
		function handleLinks(str) {
			if (/https?:\/\//ig.test(str)) {
				var re = /https?:\/\/[^\s]*/ig,
					template = '$& <a href="$&" target="_blank"><svg xmlns:xlink="http://www.w3.org/1999/xlink" width="12" height="12" viewBox="0 0 24 24"><use class="svg svg-light-bg" xlink:href="#link" x="0" y="0"></use></svg></a>';
				str = str.replace(re, template);
			}
			return str;
		}

		return {
			setDocumentHeight: setDocumentHeight,
			unsetDocumentHeight: unsetDocumentHeight,
			appendHtml: appendHtml,
			handleLinks: handleLinks
		}
	}();

	/** @constructor Locale */
	var Locale = function() {
		/** @private Array */
		var acceptedLanguages = ["en", "bg"],
		/** @private String */
			language = DocCookies.getItem("lang") || findAcceptableLanguage(),
		/** @public Object */
			collection = JSON.parse(document.getElementById("locale-" + language).innerText);

		collection["navbar"]["currentLanguage"] = language;
		collection["navbar"]["acceptedLanguages"] = acceptedLanguages;

		/** @return String */
		function findAcceptableLanguage() {
			var lang = navigator.languages
					? navigator.languages[0]
					: (navigator.language || navigator.userLanguage);
			if (!lang || acceptedLanguages.indexOf(lang) == -1)
				lang = acceptedLanguages[0];
			DocCookies.setItem("lang", lang, 15768000); // 6 months expire
			return lang;
		}

		// set document title and place header
		document.title = collection.title;
		document.getElementById("navbar").innerHTML
			= Mustache.render(
				document.getElementById("navbar-template").innerText, collection.navbar
			);

		// event listener for language change
		Event.registerHandler("changeLanguage", "click", function(e) {
			var lang;

			if (e.target.nodeName == "I") {
				lang = e.target.getAttribute("data-lang");
			} else if (e.target.nodeName == "A") {
				lang = e.target.firstElementChild.getAttribute("data-lang");
			}

			if (lang) {
				DocCookies.setItem("lang", lang, 15768000);
			}
		}).on("changeLanguage", document.getElementById("change-language"));

		return {
			collection: collection
		}
	}();

	/** @constructor Storage */
	var Storage = function() {
		// check if database exist or create it
		localforage.getItem("index").then(function(value) {
			if (value == null) {
				localforage.setItem("index", 0);
				localforage.setItem("0", {id:"0", dependent:[]});
			}
		}).catch(function(err){console.error(err);});

		/**
		 * @param String id
		 * @param Function fn
		 */
		function select(id, fn) {
			localforage
				.getItem(id)
				.then(fn)
				.catch(function(err){console.error(err);});
		}

		/**
		 * @param Object data
		 * @param Function fn
		 */
		function insert(data, fn) {
			localforage.getItem("index").then(function(index) {
				// update index of items
				var newIndex = ++index + "";
				localforage.setItem("index", index);

				data["id"] = newIndex;

				localforage
					.setItem(newIndex, data)
					.then(fn)
					.catch(function(err){console.error(err);});

				localforage
					.getItem(data["dependence"])
					.then(function(data){
						data["dependent"].push(newIndex);
						localforage
							.setItem(data["id"], data)
							.catch(function(err){console.error(err);});
					})
					.catch(function(err){console.error(err);});
			})
			.catch(function(err){console.error(err);});
		}

		/**
		 * @param String id
		 * @param Object newData
		 * @param Function fn
		 */
		function update(id, newData, fn) {
			localforage
				.getItem(id)
				.then(function(data) {
					for (var prop in newData) {
						if (data.hasOwnProperty(prop)) {
							if (typeof newData[prop] == "function")
								data[prop] = newData[prop](data[prop]);
							else data[prop] = newData[prop];
						} else console.error("There is no name property: " + prop + "!");
					}

					localforage
						.setItem(data["id"], data)
						.then(fn)
						.catch(function(err){console.error(err);});
				})
				.catch(function(err){console.error(err);});
		}

		/**
		 * @param String id
		 * @param Function fn
		 */
		function remove(id, fn) {
			localforage
				.removeItem(id)
				.then(fn)
				.catch(function(err){console.error(err);});
		}

		return {
			select: select,
			insert: insert,
			update: update,
			delete: remove
		}
	}();

	/** @constructor Modal */
	var Modal = function() {
		/** @private String */
		var formSelector = "modal-form",
		/** @private Element */
			containerElement = document.getElementById("modal-container"),
		/** @private String */
			// get modal template
			template = document.getElementById("modal-template").innerText;

		Mustache.parse(template);

		/**
		 * TODO improve this method
		 * @param Object data
		 * @param Object extraData
		 */
		function load(data, extraData) {
			if (extraData) {
				for (var key in extraData) {
					data[key] = extraData[key];
				}
			}
			containerElement.innerHTML = Mustache.render(template, data);
			$(containerElement).modal("show");
		}

		function unload() {
			$(containerElement).modal("hide");
			containerElement.innerHTML = "";
		}

		/**
		 * @constructor buttonAction - Handles modal buttons actions
		 */
		var buttonAction = function() {
			function create() {
				/** @var Object - collection with form elements */
				var form = document.forms[formSelector].elements;

				Task.create({
					id: "",
					title: form["title"].value,
					description: form["description"].value,
					dependence: form["dependence"].value,
					dependent: [],
					status: 1
				});
			}

			function update() {
				/** @var Object - collection with form elements */
				var form = document.forms[formSelector].elements;

				Task.update({
					id: form["id"].value,
					title: form["title"].value,
					description: form["description"].value
				});
			}

			function remove() {
				/** @var Object - collection with form elements */
				var form = document.forms[formSelector].elements;

				Task.remove({
					id: form["id"].value,
					dependence: form["dependence"].value
				});
			}

			return {
				create: create,
				update: update,
				delete: remove
			}
		}();

		// event handler for preventing request to server
		Event.registerHandler("preventModalSubmit", "submit", function(e) {
			e.preventDefault();
			document.getElementById("modalSubmit").click();
		}).on("preventModalSubmit", containerElement);

		// event handler for create project button
		Event.registerHandler("createProjectButton", "click", function(e) {
			load(Locale.collection["project"]["create"], { dependence: "0" });
		}).on("createProjectButton", document.getElementById("create-project-button"));

		// event handler for modal buttons
		Event.registerHandler("modalButtons", "click", function(e) {
			if (e.target.nodeName == "BUTTON") {
				if (e.target.type == "submit") {
					// perform the action
					buttonAction[e.target.getAttribute("data-action")]();
				}
				// close modal window
				unload();
			}
		}).on("modalButtons", containerElement);

		// autofocus fix for input field of modal window
		Event.registerObserver("autofocusModalInputField", { childList: true }, function(mutations) {
			//console.log(mutations);
			var input = mutations[0].target.querySelector("[autofocus]");
			if (input) setTimeout(function(){input.select();}, 850);
		}).on("autofocusModalInputField", containerElement);

		return {
			load: load,
			unload: unload
		};
	}();

	/** @constructor Task */
	var Task = function() {
		/** @private Object */
		var template = {
			project: document.getElementById("project-template").innerText,
			task: document.getElementById("task-template").innerText
		};
		/** @private Object - collection with available sortable groups of tasks */
		var groupElements = {},
		/** @private Integer */
			currentScreenWidth = document.documentElement.clientWidth,
		/** @private Element */
			lastMoveOverElement = null,
		/** @private String */
			listenEvent,
			/** @private Integer - delay starting sorting */
			delay = 0;

		// choose proper event handling
		// (not best solution but is workoround until find better)
		if ("ontouchstart" in window) {
			listenEvent = "touchstart";
			delay = 300;
		} else if ("onpointerdown" in window) {
			listenEvent = "pointerdown";
		} else if ("onmousedown" in window) {
			listenEvent = "mousedown";
		}

		// precompiling templates
		Mustache.parse(template.project);
		Mustache.parse(template.task);

		/**
		 * @param Object data
		 */
		function create(data) {
			Storage.insert(data, function(data){
				put(data);
			});
		}

		/**
		 * @param Object data
		 */
		function update(data) {
			Storage.update(data["id"], data, function(data){
				/** @var Element */
				var element = document.getElementById("title-" + data["id"]);

				if (getType(data["dependence"]) == "task") {
					data["title"] = Helper.handleLinks(data["title"]);

					if (data["status"] == "0")
						data["title"] = "<del>" + data["title"] + "</del>";
				} else element = element.firstElementChild;

				element.innerHTML = data["title"];
				element.title = data["description"];
			});
		}

		/**
		 * @param Object data
		 */
		function remove(data) {
			Storage.select(data["id"], function deleteRecursive(data) {
				data["dependent"].forEach(function(id) {
					Storage.select(id, deleteRecursive);
				});

				delete groupElements[data["id"]];
				Storage.delete(data["id"]);

			});

			Storage.update(data["dependence"], {
				dependent: function(dependent) {
					dependent.splice(dependent.indexOf(data["id"]), 1);
					return dependent;
				}
			});

			getGroupElement(data["dependence"]).removeChild(document.getElementById("item-" + data["id"]));
			Helper.unsetDocumentHeight();
		}

		/**
		 * @param Element btn
		 */
		function toggleStatus(btn) {
			/** @var String id */
			var id = btn.getAttribute("data-item-id");

			Storage.update(id, {
					status: function(status) {return +!status;}
				},
				function(data) {
					if (data["dependence"] == "0") {
						if (data["status"] == 0) btn.classList.add("inactive");
						else btn.classList.remove("inactive");

						Helper.unsetDocumentHeight();
					} else {
						var text;
						if (data["status"] == 0) {
							btn.classList.remove("btn-secondary");
							btn.classList.add('btn-success');
							btn.firstElementChild.innerHTML = '<use class="svg" xlink:href="#check" x="0" y="0"></use>';
							text = document.getElementById("title-" + id);
							text.innerHTML = "<del>" + text.innerHTML + "</del>";
						} else {
							btn.classList.remove('btn-success');
							btn.classList.add("btn-secondary");
							btn.firstElementChild.innerHTML = '<use class="svg svg-light-bg" xlink:href="#eye" x="0" y="0"></use>';
							text = document.getElementById("title-" + id);
							text.innerHTML = Helper.handleLinks(text.innerText);
						}
					}
			});
		}

		/**
		 * @param Element btn
		 */
		function toggleButtons(btn) {
			var element = document.getElementById(btn.getAttribute("data-target"));
			if (element.classList.contains("act-btns-show"))
				element.classList.remove("act-btns-show");
			else element.classList.add("act-btns-show");
		}

		/** @constructor buttonAction - handles task buttons actions */
		var buttonAction = function() {
			/**
			 * @param Element btn
			 */
			function after(btn) {
				if (currentScreenWidth < 993) {
					setTimeout(function() {
						btn.parentElement.classList.remove("act-btns-show")
					}, 500);
				}
			}

			/**
			 * @param Element btn
			 */
			function create(btn) {
				var dependence = btn.getAttribute("data-dependence");
				Modal.load(Locale.collection[getType(dependence)]["create"], { dependence: dependence });
				after(btn);
			}

			/**
			 * @param Element btn
			 */
			function edit(btn) {
				var id = btn.getAttribute("data-item-id");
				Storage.select(id, function(data) {
					Modal.load(Locale.collection[getType(data.dependence)]["edit"], data);
				});
				after(btn);
			}

			/**
			 * @param Element btn
			 */
			function remove(btn) {
				var dependence = btn.getAttribute("data-dependence"),
					id = btn.getAttribute("data-item-id");
				Modal.load(Locale.collection[getType(dependence)]["delete"], { id: id, dependence: dependence });
				after(btn);
			}

			return {
				create: create,
				edit: edit,
				delete: remove,
				toggleStatus: toggleStatus,
				toggleButtons: toggleButtons
			}
		}();

		/**
		 * @param String id
		 * @return String - project|task
		 */
		function getType(id) {
			return id == "0" ? "project" : "task";
		}

		/**
		 * @param String id
		 * @return Element
		 */
		function getGroupElement(id) {
			if (id in groupElements) return groupElements[id];
			return groupElements[id] = document.getElementById("group-" + id);
		}

		/**
		 * @param Object data
		 */
		function put(data) {
			if (getType(data["dependence"]) == "task")
				data["title"] = Helper.handleLinks(data["title"]);

			var type = getType(data["dependence"]),
				html = Mustache.render(template[type], data),
				element = Helper.appendHtml(getGroupElement(data["dependence"]), html);

			makeSortable(getGroupElement(data["id"]));

			data["dependent"].forEach(function(id) {
				Storage.select(id, put);
			});
		}

		/**
		 * @param Element element
		 * @patam String group - group type
		 */
		function makeSortable(element, group) {
			group = group || "task";
			Sortable.create(element, {
				group: group,
				animation: 258,
				delay: delay,
				// filter grabbing element
				filter: function(e) {
					e.stopPropagation();
					/** @var Element */
					var btn;

					// prevent double handling of one event in event chain sequence
					if (e.type == listenEvent) {
						//console.log(e);
						// TODO make better fix of svg image inside button
						switch (e.target.nodeName.toUpperCase()) {
							case "BUTTON":
								btn = e.target;
								break;
							case "H3":
								btn = e.target.parentElement;
								break;
							case "SVG":
								btn = e.target.parentElement;
								break;
							case "USE":
								btn = e.target.parentElement.parentElement;
						}

						if (btn && btn.nodeName == "BUTTON") {
							e.preventDefault();
							buttonAction[btn.getAttribute("data-action")](btn);
							return true;
						} else if (btn && btn.nodeName == "A") {
							e.preventDefault();
							return true;
						}
					}

					Helper.setDocumentHeight();
					return false;
				},
				// dragging ended
				onEnd: function (e) {
					Helper.unsetDocumentHeight();
					if (lastMoveOverElement)
						lastMoveOverElement.classList.remove("p-2");
				},
				// Element is dropped into the list from another list
				onAdd: function(e) {
					/** @var String */
					var id = e.item.getAttribute("data-id"),
					/** @var String */
						newDependence = e.to.getAttribute("data-group-id");
					Storage.update(id, { dependence: newDependence });
					Storage.update(newDependence, { dependent: this.toArray() });
				},
				// Element is removed from the list into another list
				onRemove: function (e) {
					/** @var String */
					var oldDependence = e.from.getAttribute("data-group-id");
					Storage.update(oldDependence, { dependent: this.toArray() });
				},
				// Changed sorting within list
				onUpdate: function(e) {
					/** @var String */
					var dependence = e.from.getAttribute("data-group-id");
					Storage.update(dependence, { dependent: this.toArray() });
				},
				// Element is moved
				onMove: function(e) {
					// TODO think over this and improve it
					/** @var Element */
					var sortableGroup = e.related.lastElementChild;

					if (
						sortableGroup.childElementCount == 0
						&& lastMoveOverElement !== sortableGroup
					) {
						if (lastMoveOverElement)
							lastMoveOverElement.classList.remove("p-2");
						lastMoveOverElement = sortableGroup;
						sortableGroup.classList.add("p-2");
					} else if (lastMoveOverElement) {
						lastMoveOverElement.classList.remove("p-2");
						lastMoveOverElement = null;
					}
				}
			});
		}

		// event handler for keyboard keys
		Event.registerHandler("keyboard", "keydown", function(e) {
			if ((e.keyCode == 13 || e.keyCode == 32) && e.target.nodeName == "BUTTON") {
				if (e.target.hasAttribute("data-action")) {
					e.stopPropagation();
					e.preventDefault();
					buttonAction[e.target.getAttribute("data-action")](e.target);
					//console.log(e.type, e);
				}
			}
			//console.log(e.type, e);
		}).on("keyboard", document);

		// event handler for capturing width when  window resizes
		Event.registerHandler("windowResize", "resize", function(e) {
			currentScreenWidth = document.documentElement.clientWidth;
		}).on("windowResize", window);

		// render projects with tasks when page load
		Storage.select("0", function(data) {
			makeSortable(getGroupElement("0"), "project");
			if (data) {
				data["dependent"].forEach(function(id) {
					Storage.select(id, put);
				});
			}
		});

		return {
			create: create,
			update: update,
			remove: remove,
			toggleStatus: toggleStatus,
			getType: getType
		}
	}();

	// initialization when document is loaded
	//Event.registerHandler("ready", "DOMContentLoaded", function() {
		// not used yet
	//}).on("ready", document);
})();
