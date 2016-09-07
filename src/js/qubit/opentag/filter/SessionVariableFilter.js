//:import qubit.opentag.Log
//:import qubit.opentag.Utils
//:import qubit.Define
//:import qubit.opentag.filter.BaseFilter
//:import qubit.opentag.filter.URLFilter

/*
 * TagSDK, a tag development platform
 * Copyright 2013-2014, Qubit Group
 * http://opentag.qubitproducts.com
 * Author: Peter Fronc <peter.fronc@qubitdigital.com>
 */

(function () {
  var BaseFilter = qubit.opentag.filter.BaseFilter;
  var URLFilter = qubit.opentag.filter.URLFilter;
  var Utils = qubit.opentag.Utils;

  /**
   * #SessionVariable filter class.
   *  
   * This class is a compatibility layer part for TagSDK.
   * Session filters are used to customise scripts execution and use custom
   * scripts:
   * - to determine match for the page
   * - to trigger tag execution
   * 
   * If config object contains properties:
   * - `customScript` a function that is used to determine if filter matches. 
   *  It takes session object as a parameter.
   * - `customStarter` a function that is responsible for running the tag.
   *  By default it is an empty function, calling "ready" argument immediately.
   *  The `ready` argument is a callback triggering tag loading. `customStarter`
   *  takes 3 arguments in the order:
   *  1) `session` the session object
   *  2) `ready` the ready callback that runs the tag, note: it will run the tag
   *  directly.
   *  3) `tag` tag reference object.
   * 
   * When creating tags, consider using new API that serve typical use cases for
   * the session filters.
   * 
   * Example:
   * If tag depends on some property that will appear in window scope, like
   *  `jQuery`, use `genericDependencies` array in tag object and push function
   *  there that returns true when the `jQuery` object exists.
   * 
   * 
   * @class qubit.opentag.filter.SessionVariableFilter
   * @extends qubit.opentag.filter.URLFilter
   * @param config {Object} config object used to build instance
   */
  var sessionVariableFilterCount = 0;
  function SessionVariableFilter(config) {
    var defaultConfig = {
      /**
       * Custom starter function for session filter.
       * Takes 3 arguments in the order:
       *  1) `session` the session object
       *  2) `ready` the ready callback that runs the tag, note: it will run the tag
       *  directly.
       *  3) `tag` tag reference object.
       * @cfg {Function}
       * @param {qubit.opentag.Session} session
       * @param {Function} ready
       * @param {qubit.opentag.BaseTag} tag
       */
      //customStarter: null,
      /**
       * Script deciding either script matches or not (top API level).
       * @cfg {Function}
       * @param {qubit.opentag.Session} session
       * @returns {Boolean}
       */
      //customScript: null
    };
    
    if (config) {
      for (var prop in config) {
        if (config.hasOwnProperty(prop)) {
          if (prop === "customStarter" && config[prop]) {
            this.customStarter = config[prop];
          } else  if (prop === "customScript" && config[prop]) {
            this.customScript = config[prop];
          }
          
          defaultConfig[prop] = config[prop];
        }
      }
      this.uid = "f" + (sessionVariableFilterCount++);
    }
    this.tagsToRun = [];
    SessionVariableFilter.SUPER.call(this, defaultConfig);
  }
  
  qubit.Define.clazz(
          "qubit.opentag.filter.SessionVariableFilter",
          SessionVariableFilter,
          URLFilter);
  
  /**
   * Custom starter function for session filter.
   * Takes 3 arguments in the order:
   *  1) `session` the session object
   *  2) `ready` the ready callback that runs the tag, note: it will run the tag
   *  directly.
   *  3) `tag` tag reference object.
   * This function can be overrided by `config.customStarter` function.
   * 
   * @param {qubit.opentag.Session} session
   * @param {Function} ready
   * @param {qubit.opentag.BaseTag} tag
   */
  SessionVariableFilter.prototype.customStarter = function (
                                                          session,
                                                          ready,
                                                          tag) {
    ready(false);
  };
  
  SessionVariableFilter.prototype.isAllStartersDefaults = function () {
    if (this.customStarter !== SessionVariableFilter.prototype.customStarter) {
      return false;
    }
    if (this.customScript !== SessionVariableFilter.prototype.customScript) {
      return false;
    }
    return true;
  };
  
  /**
   * Script deciding either script matches or not (top API level).
   * This function can be overrided by `config.customScript` function.
   * 
   * @param {qubit.opentag.Session} session
   * @returns {Boolean}
   */
  SessionVariableFilter.prototype.customScript = function (session) {
    return true;
  };
  
  /**
   * Match function for a filter.
   * @returns {Boolean}
   */
  SessionVariableFilter.prototype.match = function (url) {
    var match = true;
    try {
      if (this._matchState === undefined) {
        this._matchState = !!this.customScript(this.getSession());
      }
      match = this._matchState;
    } catch (ex) {
      this.log.FINE("Filter match throws exception:" + ex);/*L*/
      match = false;
    }
    
    return match && SessionVariableFilter.SUPER.prototype
            .match.call(this, url);
  };
  
  /**
   * Function that will trigger running tag directly the callback privided in
   * configuration object, the `customStarter`.
   * @param {qubit.opentag.BaseTag} tag
   */
  SessionVariableFilter.prototype.runTag = function (tag) {
    Utils.addToArrayIfNotExist(this.tagsToRun, tag);
    if (!this._runTag) {
      if (this.customStarter) {
        var callback = function (rerun) {
          this.lastRun = new Date().valueOf();
          this._processQueuedTagsToRun(rerun);
          this._rerun = rerun;
          //done
        }.bind(this);
        
        //trigger "customStarter", only once
        this._runTag = true;
        this.customStarter(this.getSession(), callback, tag);
      }
    } else {
      if (this.lastRun) {//if the callback was already run. Note: if callback
        //hasnt be called, tags are queued to execute.
        if (this._rerun === true) {
          tag.run();
        } else {
          tag.runOnce();
        }
      }
    }
  };
  
  /**
   * @private
   * Strictly private.
   */
  SessionVariableFilter.prototype._processQueuedTagsToRun = function (rerun) {
    for (var i = 0; i < this.tagsToRun.length; i++) {
      var tag = this.tagsToRun[i];
      if (rerun === true) {
        tag.run();
      } else {
        tag.runOnce();
      }
    }
  };
  
  /**
   * State function, this function adds to standard state function the SESSION
   * state. Session state is used if `customStarter` is attached.
   * @param {qubit.opentag.Session} session optional session
   */
  SessionVariableFilter.prototype.getState = function (session) {
    if (session) {
      this.setSession(session);
    }
    var pass = SessionVariableFilter.SUPER.prototype.getState.call(this);
    
    if (pass === BaseFilter.state.DISABLED) {
      return BaseFilter.state.DISABLED;
    }
    
    if (pass === BaseFilter.state.PASS) {
      if (this.customStarter) {
        pass = BaseFilter.state.SESSION;
      }
    }
    
    if (this.config.script) {
      pass = this.config.script.call(this, pass, this.getSession());
    }
    
    this.lastState = pass;
    return pass;
  };
  
  /**
   * Reset function.
   */
  SessionVariableFilter.prototype.reset = function () {
    this._matchState = undefined;
    SessionVariableFilter.SUPER.prototype.reset.call(this);
    this._runTag = undefined;
    this.lastRun = undefined;
    this.tagsToRun = [];
  };
}());