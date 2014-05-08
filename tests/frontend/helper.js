/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var browser;
var by;

function Helper() {
  EventEmitter.call(this);
}
util.inherits(Helper, EventEmitter);

var api = new Helper();
module.exports = api;

// called by onPrepare in config script
Helper.prototype.init = function(options) {
  browser = GLOBAL.browser;
  by = GLOBAL.by;

  options = options || {};
  this.browser = browser;
  this.baseUrl = browser.baseUrl;
  this.pages = require('./pages');

  this.get('/');
  this.emit('init');
};

// gets a URL that returns an AngularJS page and waits for it to bootstrap
Helper.prototype.get = function(url) {
  // wait for ng-app to appear
  browser.driver.get(browser.baseUrl + url);
  return this.waitForAngular();
};

// runs a script in the browser's context
// pass fn($injector) for a sync script, fn($injector, callback) for async
Helper.prototype.run = function(fn) {
  fn = fn.toString();
  var isAsync = (fn.split('\n')[0].indexOf(',') !== -1);
  var execute = isAsync ? browser.executeAsyncScript : browser.executeScript;
  return execute(
    "var $injector = angular.element('body').data('$injector');" +
    "var callback = arguments[arguments.length - 1];" +
    'return (' + fn + ')($injector, callback);');
};

// waits for AngularJS to be bootstrapped
Helper.prototype.waitForAngular = function() {
  return browser.driver.wait(function() {
    return browser.driver.isElementPresent(by.tagName(browser.rootEl))
      .then(function(present) {
        if(!present) {
          return false;
        }
        return browser.driver.findElement(by.tagName(browser.rootEl))
          .then(function(body) {
            return body.getAttribute('ng-app').then(function(value) {
              return !!value;
            });
          });
      });
  });
};

// waits for an element to be displayed
Helper.prototype.waitForElement = function(el) {
  return browser.wait(function() {
    return el.isDisplayed();
  });
};

// waits for an attribute to meet a certain criteria
Helper.prototype.waitForAttribute = function(el, attr, fn) {
  return browser.wait(function() {
    return el.getAttribute(attr).then(function(value) {
      return fn(value);
    });
  });
};

// waits for a particular URL to load
Helper.prototype.waitForUrl = function(url) {
  url = this.baseUrl + url;
  var ptor = GLOBAL.protractor.getInstance();
  return browser.wait(function() {
    return ptor.getCurrentUrl().then(function(currentUrl) {
      return currentUrl === url;
    });
  });
};

// waits for a client-side script to return true
// eg: can check angular.element('.foo').scope().model.bar against some value
Helper.prototype.waitForScript = function(fn) {
  var self = this;
  return browser.wait(function() {
    return self.run(fn);
  });
};

// gets a random alphabetical string
Helper.prototype.randomString = function(length) {
  var idx_A = 'A'.charCodeAt(0);
  var idx_a = 'a'.charCodeAt(0) - 26;
  length = length || 10;
  var rval = '';
  while(rval.length < length) {
    var code = Math.floor(Math.random() * 52);
    code += (code < 26) ? idx_A : idx_a;
    rval += String.fromCharCode(code);
  }
  return rval;
};

// logs in via the navbar
Helper.prototype.login = function(identifier, password) {
  this.pages.navbar.login(identifier, password);
  return this;
};

// logs out via navbar
Helper.prototype.logout = function() {
  this.pages.navbar.logout();
  return this;
};

api.on('init', function() {
  // return an element via an attribute value
  by.addLocator('attribute', function(attr, value, parent) {
    if(arguments.length === 2) {
      parent = value;
      value = undefined;
    }
    var using = parent || document;
    var query = attr;
    if(typeof value !== 'undefined') {
      query += "='" + value + "'";
    }
    query += ']';
    query = '[' + query + ', [data-' + query;
    return using.querySelectorAll(query);
  });

  // return a popover that is controlled by the given model var
  by.addLocator('popover', function(model, parent) {
    var using = parent || document;
    var query = "popover-visible='" + model + "']";
    query = '[' + query + ', [data-' + query;
    return using.querySelectorAll(query);
  });

  // return the top-level modal
  by.addLocator('modal', function() {
    return document.querySelectorAll('.modal-wrapper > .modal');
  });

  // return a button to open a menu that contains an item with the given text
  by.addLocator('menuButtonForItem', function(value, parent) {
    value = value.trim();
    var using = parent || document;

    // get menu buttons
    var buttons = using.querySelectorAll('.dropdown-toggle');
    return Array.prototype.filter.call(buttons, function(button) {
      // if a menu the button opens has the item text, allow the button
      var menus = button.parentElement.querySelectorAll('.dropdown-menu');
      for(var mi = 0; mi < menus.length; ++mi) {
        var items = menus[mi].querySelectorAll('li > a');
        for(var ii = 0; ii < items.length; ++ii) {
          if(items[ii].textContent.trim() === value) {
            return true;
          }
        }
      }
      return false;
    });
  });

  // return a menu item with the given text
  by.addLocator('menuItem', function(value, parent) {
    value = value.trim();
    var using = parent || document;
    var items = using.querySelectorAll('.dropdown-menu > li > a');
    return Array.prototype.filter.call(items, function(item) {
      return item.textContent.trim() === value;
    });
  });
});
