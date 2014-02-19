/*!
 * Resource Service.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
define(['angular', 'underscore'], function(angular, _) {

'use strict';

var deps = ['$rootScope', '$http', 'svcModel'];
return {svcResource: deps.concat(factory)};

function factory($rootScope, $http, svcModel) {
  var service = {};

  // create a new collection
  // config: {
  //   storage: reference to external array of data (optional)
  //   url: url to collection (string)
  //   expires: url to collection (ms, optional [0])
  //   maxAge: maximum cache age (ms, optional [2m])
  // }
  service.Collection = function(config) {
    this.config = config;
    this.storage = config.storage || [];
    this.expires = config.expires || 0;
    this.maxAge = config.maxAge || (1000 * 60 * 2);

    this.loadingCount = 0;
    this.state = {
      loading: false
    };
  };

  service.Collection.prototype.startLoading = function(count) {
    count = count || 1;
    this.loadingCount = this.loadingCount + count;
    this.state.loading = true;
  };

  service.Collection.prototype.finishLoading = function(count) {
    count = count || 1;
    this.loadingCount = this.loadingCount - count;
    this.state.loading = (this.loadingCount !== 0);
  };

  // get all collection resources
  service.Collection.prototype.getAll = function(options) {
    var self = this;
    options = options || {};
    if(Date.now() < self.expires && !options.force) {
      return Promise.resolve(self.storage);
    }
    return new Promise(function(resolve, reject) {
      self.startLoading();
      var config = {};
      if('delay' in options) {
        config.delay = options.delay;
      }
      var promise = Promise.cast($http.get(self.config.url, config));
      promise.then(function(response) {
        self.expires = Date.now() + self.maxAge;
        svcModel.replaceArray(self.storage, response.data);
        self.finishLoading();
        resolve(self.storage);
        $rootScope.$apply();
      }).catch(function(response) {
        self.finishLoading();
        reject(response.data);
        $rootScope.$apply();
      });
    });
  };

  // get one resource
  service.Collection.prototype.get = function(resourceId, options) {
    var self = this;
    options = options || {};
    if(Date.now() < self.expires && !options.force) {
      // check if resource already loaded
      var current = _.findWhere(self.storage, {id: resourceId});
      if(current) {
        return Promise.resolve(current);
      }
    }
    // FIXME: reject if resourceId not a sub-url of collection
    return new Promise(function(resolve, reject) {
      self.startLoading();
      var config = {};
      if('delay' in options) {
        config.delay = options.delay;
      }
      var promise = Promise.cast($http.get(resourceId, config));
      promise.then(function(response) {
        self.expires = Date.now() + self.maxAge;
        svcModel.replaceInArray(self.storage, response.data);
        self.finishLoading();
        resolve(response.data);
        $rootScope.$apply();
      }).catch(function(response) {
        self.finishLoading();
        reject(response.data);
        $rootScope.$apply();
      });
    });
  };

  // add one resource
  service.Collection.prototype.add = function(resource, options) {
    var self = this;
    options = options || {};
    return new Promise(function(resolve, reject) {
      self.startLoading();
      var config = {};
      if('delay' in options) {
        config.delay = options.delay;
      }
      var promise = Promise.cast($http.post(self.config.url, resource, config));
      promise.then(function(response) {
        self.expires = Date.now() + self.maxAge;
        self.storage.push(response.data);
        self.finishLoading();
        resolve(response.data);
        $rootScope.$apply();
      }).catch(function(response) {
        self.finishLoading();
        reject(response.data);
        $rootScope.$apply();
      });
    });
  };

  // update one resource
  service.Collection.prototype.update = function(resource, options) {
    var self = this;
    options = options || {};
    return new Promise(function(resolve, reject) {
      self.startLoading();
      var config = {};
      if('delay' in options) {
        config.delay = options.delay;
      }
      var promise = Promise.cast($http.post(resource.id, resource, config));
      promise.then(function(response) {
        self.finishLoading();
        // get updated resource
        return self.get(resource.id, {force: true});
      }).catch(function(response) {
        self.finishLoading();
        reject(response.data);
        $rootScope.$apply();
      });
    });
  };

  // delete one resource
  service.Collection.prototype.del = function(resourceId, options) {
    var self = this;
    options = options || {};
    return new Promise(function(resolve, reject) {
      self.startLoading();
      var config = {};
      if('delay' in options) {
        config.delay = options.delay;
      }
      var promise = Promise.cast($http.delete(resourceId, config));
      promise.then(function(response) {
        svcModel.removeFromArray(resourceId, self.storage);
        self.finishLoading();
        resolve();
        $rootScope.$apply();
      }).catch(function(response) {
        self.finishLoading();
        reject(response.data);
        $rootScope.$apply();
      });
    });
  };

  return service;
}

});
