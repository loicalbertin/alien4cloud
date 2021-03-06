// list of cloud images that can be defined for multiple clouds actually.
define(function (require) {
  'use strict';

  var modules = require('modules');
  var states = require('states');
  var _ = require('lodash');
  var angular = require('angular');

  require('scripts/common/directives/upload');
  require('scripts/cloud-images/services/cloud_image_services');

  states.state('admin.cloud-images.detail', {
    url: 'detail/:id?mode',
    resolve: {
      cloudImage: ['cloudImageServices', '$stateParams',
        function(cloudImageServices, $stateParams) {
          return cloudImageServices.get({
            id: $stateParams.id
          }).$promise.then(function(success) {
              var cloudImage = success.data;
              if (_.defined(cloudImage.requirement)) {
                cloudImage.numCPUs = cloudImage.requirement.numCPUs;
                cloudImage.diskSize = cloudImage.requirement.diskSize;
                cloudImage.memSize = cloudImage.requirement.memSize;
              }
              return cloudImage;
            });
        }
      ]
    },
    templateUrl: 'views/cloud-images/cloud_image_detail.html',
    controller: 'CloudImageDetailController'
  })

  modules.get('a4c-clouds', ['ui.router']).controller(
  'CloudImageDetailController', ['$scope', '$state', '$stateParams', '$upload', 'cloudImageServices', 'cloudImage',
    function($scope, $state, $stateParams, $upload, cloudImageServices, cloudImage) {
      $scope.cloudImage = cloudImage;
      // if we are coming from create form, the stateParam mode='edit'
      $scope.isEditModeActive = _.defined($stateParams.mode) ? $stateParams.mode === 'edit' : false;
      $scope.isLinkedToMoreThanOneCloud = false;
      var isReadOnly = !$scope.isEditModeActive;
      $scope.cloudImageFormDescriptor = cloudImageServices.getFormDescriptor();
      $scope.cloudImageFormDescriptor._propertyType.name._isTitle = isReadOnly;
      $scope.cloudImageFormDescriptor._propertyType.name._isReadOnly = isReadOnly;
      $scope.cloudImageFormDescriptor._propertyType.osType._isReadOnly = isReadOnly;
      $scope.cloudImageFormDescriptor._propertyType.osDistribution._isReadOnly = isReadOnly;
      $scope.cloudImageFormDescriptor._propertyType.osVersion._isReadOnly = isReadOnly;
      $scope.cloudImageFormDescriptor._propertyType.osArch._isReadOnly = isReadOnly;
      $scope.cloudImageFormDescriptor._propertyType.numCPUs._isReadOnly = isReadOnly;
      $scope.cloudImageFormDescriptor._propertyType.diskSize._isReadOnly = isReadOnly;
      $scope.cloudImageFormDescriptor._propertyType.memSize._isReadOnly = isReadOnly;

      // Upload handler
      $scope.doUpload = function(file) {
        $upload.upload({
          url: 'rest/cloud-images/' + $scope.cloudImage.id + '/icon',
          file: file
        }).success(function(result) {
          $scope.cloudImage.iconId = result.data;
        });
      };

      $scope.onIconSelected = function($files) {
        if ($scope.isEditModeActive) {
          var file = $files[0];
          $scope.doUpload(file);
        }
      };

      $scope.delete = function() {
        cloudImageServices.remove({
          id: $scope.cloudImage.id
        }, undefined, function() {
          $state.go('admin.cloud-images.list');
        });
      };

      $scope.save = function(object) {
        cloudImageServices.update({
          id: $scope.cloudImage.id
        }, angular.toJson(object));
      };

      $scope.switchEditMode = function() {
        if (!$scope.isEditModeActive) {
          // here I should get from anywhere the list of clouds linked to this image
          // - if the list size > 1 only the name (?), numCPUs, diskSize & memSize are editable
          cloudImageServices.getClouds({
            id: $scope.cloudImage.id
          }, function(cloudNames) {
            $scope.isEditModeActive = true;
            if (cloudNames.data.length <= 1) {
              $scope.cloudImageFormDescriptor._propertyType.osType._isReadOnly = false;
              $scope.cloudImageFormDescriptor._propertyType.osDistribution._isReadOnly = false;
              $scope.cloudImageFormDescriptor._propertyType.osVersion._isReadOnly = false;
              $scope.cloudImageFormDescriptor._propertyType.osArch._isReadOnly = false;
            } else {
              $scope.isLinkedToMoreThanOneCloud = true;
              $scope.translationData = {
                cloudNames: _(cloudNames.data).toString()
              };
            }
            $scope.cloudImageFormDescriptor._propertyType.name._isReadOnly = false;
            $scope.cloudImageFormDescriptor._propertyType.numCPUs._isReadOnly = false;
            $scope.cloudImageFormDescriptor._propertyType.diskSize._isReadOnly = false;
            $scope.cloudImageFormDescriptor._propertyType.memSize._isReadOnly = false;
          });
        }
      };

    }
  ]); // controller
}); // define
