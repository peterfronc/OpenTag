/*
 * Opentag, a tag deployment platform
 * Copyright 2013-2018, Qubit Group
 * http://opentag.qubitproducts.com
 * Author: Peter Fronc <peter.fronc@qubitdigital.com>
 */

//:import GLOBAL
//:import qubit.opentag.Utils
//:import qubit.Define

(function () {
  var Define = qubit.Define;
  var Utils = qubit.opentag.Utils;

  /**
   * @class qubit.Events
   * Simple events manager.
   *
   * @param {Object} config empty object.
   */
  function Events(config) {
    this.log = new qubit.opentag.Log("Events -> ");/*L*/
    this.calls = {};
  }

  /**
   * Simple events adding function. IT pushes a function to named
   * execution array. If function already is in the array,
   * it has no effect. To access array, use 'this.calls' on
   * this object.
   * @param {String} name simple name for event.
   * @param {Function} call
   * @returns {Number} index in array of events for the name.
   *        -1 if added at end of queue.
   */
  Events.prototype.on = function (name, call) {
    if (!this.calls[name]) {
      this.calls[name] = [];
    }
    return Utils.addToArrayIfNotExist(this.calls[name], call);
  };

  /**
   * Function will cause triggering event for given name.
   * @param {String} name Event name
   * @param {Object} event Event object
   */
  Events.prototype.call = function (name, event) {
    var calls = this.calls[name];
    if (calls) {
      for (var i = 0; i < calls.length; i++) {
        try {
          calls[i](event);
        } catch (ex) {
          this.log.ERROR("Error while running event: " + ex);/*L*/
        }
      }
    }
  };

  /**
   * Delete event from array.
   * @param {String} name event name
   * @param {Function} call to be removed.
   * @returns {undefined}
   */
  Events.prototype.remove = function (name, call) {
    if (this.calls[name]) {
      return Utils.removeFromArray(this.calls[name], call);
    }
    return null;
  };

  /**
   * Removes all event handlers === to call of any type from this object.
   * @param {Function} call
   * @returns {Number} Total amount of removed events.
   */
  Events.prototype.removeAll = function (call) {
    var total = 0;
    for (var prop in this.calls) {
      if (this.calls.hasOwnProperty(prop)) {
        total += Utils.removeFromArray(this.calls[prop], call);
      }
    }
    return total;
  };

  /**
   * Removes all events of any type from this stack.
   */
  Events.prototype.clear = function () {
    this.calls = {};
  };

  Define.clazz("qubit.Events", Events);
})();

