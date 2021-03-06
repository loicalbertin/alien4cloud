// list of cloud images that can be defined for multiple clouds actually.
define(function (require) {
  'use strict';

  var modules = require('modules');
  var states = require('states');
  var _ = require('lodash');
  var angular = require('angular');

  require('toaster');
  require('scripts/clouds/services/cloud_services');
  require('scripts/meta-props/services/meta_props_conf_services');
  require('scripts/deployment/services/deployment_services');
  require('scripts/users/services/user_services');
  require('scripts/users/services/group_services');
  require('scripts/common/filters/bytes');
  require('scripts/common/directives/os_icon');
  require('scripts/common/directives/pagination');
  require('scripts/meta-props/directives/meta_props_display');

  require('scripts/clouds/controllers/new_flavor');
  require('scripts/clouds/controllers/new_network');
  require('scripts/clouds/controllers/new_storage');
  require('scripts/clouds/controllers/new_zone');
  require('scripts/cloud-images/controllers/new_cloud_image');

  states.state('admin.clouds.detail', {
    url: '/:id',
    templateUrl: 'views/clouds/cloud_detail.html',
    controller: 'CloudDetailController'
  });

  modules.get('a4c-clouds', ['ui.router', 'ui.bootstrap', 'a4c-common', 'toaster', 'pascalprecht.translate']).controller('CloudDetailController',
    ['$scope', '$http', '$resource', '$stateParams', '$timeout', 'cloudServices', 'metapropConfServices', '$state', 'deploymentServices', 'toaster', '$translate', 'userServices', 'groupServices', '$modal', 'resizeServices', '$q', 'searchServiceFactory', 'cloudImageServices', '$filter',
    function($scope, $http, $resource, $stateParams, $timeout, cloudServices, metapropConfServices, $state, deploymentServices, toaster, $translate, userServices, groupServices, $modal, resizeServices, $q, searchServiceFactory, cloudImageServices, $filter) {
      var cloudId = $stateParams.id;

      $scope.iaasTypes = ['OTHER', 'AZURE', 'OPENSTACK', 'VMWARE', 'AMAZON', 'VIRTUALBOX'];
      $scope.envTypes = ['OTHER', 'DEVELOPMENT', 'INTEGRATION_TESTS', 'USER_ACCEPTANCE_TESTS', 'PRE_PRODUCTION', 'PRODUCTION'];
      $scope.tabs = {
        newTemplates: 0
      };
      $scope._ = _;
      /**
       * FOR USER SEARCH AND ADD GROUP'S ROLE
       */
      var updateRoles = function(roles, role, operation) {
        switch (operation) {
          case 'add':
            if (!roles) {
              roles = [];
            }
            roles.push(role);
            return roles;
          case 'remove':
            var index = roles.indexOf(role);
            roles.splice(index, 1);
            return roles;

          default:
            break;
        }
      };

      // handle CloudDTO
      var handleCloudResponse = function(response) {
        // the cloud
        $scope.cloud = response.data.cloud;
        // templates computed by backend
        $scope.templates = response.data.cloud.computeTemplates;
        // stuff associated to the cloud
        $scope.images = response.data.images;
        $scope.flavors = response.data.flavors;
        $scope.networks = response.data.networks;
        $scope.storages = response.data.storages;
        $scope.zones = response.data.zones;
        // ids coming from pass
        $scope.paaSImageIds = response.data.paaSImageIds;
        $scope.paaSFlavorIds = response.data.paaSFlavorIds;
        $scope.paaSNetworkIds = response.data.paaSNetworkTemplateIds;
        $scope.paaSStorageIds = response.data.paaSStorageTemplateIds;
        $scope.paaSZoneIds = response.data.paaSZoneIds;
        // array of PaaS stuff IDs available for mapping
        $scope.availaiblePaaSImageIds = [];
        $scope.availaiblePaaSFlavorIds = [];
        $scope.availaiblePaaSNetworkIds = [];
        $scope.availaiblePaaSStorageIds = [];
        $scope.availaiblePaaSZoneIds = [];
        // counters for non mapped stuffs
        $scope.imageNotConfiguredCount = 0;
        $scope.flavorNotConfiguredCount = 0;
        $scope.networkNotConfiguredCount = 0;
        $scope.storageNotConfiguredCount = 0;
        $scope.zoneNotConfiguredCount = 0;
        // id of images candidat to be added
        $scope.imageAddSelection = [];
        // to display unmapped stuffs alerts
        updateImageResourcesStatistic();
        updateFlavorResourcesStatistic();
        updateComputeResourcesStatistic();
        updateNetworkResourcesStatistic();
        updateStorageResourcesStatistic();
        updateZoneResourcesStatistic();

        $scope.relatedUsers = {};
        if ($scope.cloud.userRoles) {
          var usernames = [];
          for (var username in $scope.cloud.userRoles) {
            if ($scope.cloud.userRoles.hasOwnProperty(username)) {
              usernames.push(username);
            }
          }
          if (usernames.length > 0) {
            userServices.get([], angular.toJson(usernames), function(usersResults) {
              var data = usersResults.data;
              for (var i = 0; i < data.length; i++) {
                $scope.relatedUsers[data[i].username] = data[i];
              }
            });
          }
        }

        $scope.relatedGroups = {};
        if ($scope.cloud.groupRoles) {
          var groupIds = [];
          for (var groupId in $scope.cloud.groupRoles) {
            if ($scope.cloud.groupRoles.hasOwnProperty(groupId)) {
              groupIds.push(groupId);
            }
          }
          if (groupIds.length > 0) {
            groupServices.getMultiple([], angular.toJson(groupIds), function(groupsResults) {
              var data = groupsResults.data;
              for (var i = 0; i < data.length; i++) {
                $scope.relatedGroups[data[i].id] = data[i];
              }
            });
          }
        }
      };

      var refreshCloud = function() {
        cloudServices.get({
          id: cloudId
        }, function(response) { handleCloudResponse(response); });
      };

      refreshCloud();
      // get all cloud assignable roles
      $resource('rest/auth/roles/cloud', {}, {
        method: 'GET'
      }).get().$promise.then(function(roleResult) {
        $scope.cloudRoles = roleResult.data;
      });

      $scope.updateCloud = function(cloud) {
        if (cloud.hasOwnProperty('name') && Object.keys(cloud).length === 1 && cloud.name === $scope.cloud.name) {
          return;
        }

        cloud.id = $scope.cloud.id;
        $scope.cloudSaving = true;

        var resetSaved = function() {
          $scope.cloudSavedSuccess = false;
          $scope.cloudSavedError = false;
        };

        cloudServices.update([], angular.toJson(cloud), function() {
          $scope.cloudSaving = false;
          $scope.cloudSavedSuccess = true;
          $timeout(resetSaved, 500, true);
        }, function() {
          $scope.cloudSaving = false;
          $scope.cloudSavedError = true;
          $timeout(resetSaved, 500, true);
        });

      };

      $scope.enableCloud = function() {
        $scope.enablePending = true;
        $http.get('rest/clouds/' + cloudId + '/enable')
          .success(function(response) {
            if (_.defined(response.error)) {
              // toaster message
              toaster.pop('error', $translate('CLOUDS.ERRORS.ENABLING_FAILED_TITLE'), $translate('CLOUDS.ERRORS.ENABLING_FAILED'), 4000, 'trustedHtml', null);
              $scope.cloud.enabled = false;
            } else {
              refreshCloud();
              $scope.cloud.enabled = true;
              $scope.showForceDisableCloud = false;
            }
            $scope.enablePending = false;
          })
          .error(function() {
            $scope.enablePending = false;
          });
      };

      $scope.showForceDisableCloud = false;
      $scope.disableCloud = function(force) {
        $scope.enablePending = true;
        $http.get('rest/clouds/' + cloudId + '/disable/' + force)
          .success(function(response) {
            if (response.data) {
              $scope.cloud.enabled = false;
            } else {
              if (!force) {
                $scope.showForceDisableCloud = true;
                $timeout(function() {
                  angular.element( document.querySelector( '#force-cloud-disable-button' ) ).triggerHandler('click');
                  }, 0);
                console.log(angular.element( document.querySelector( '#force-cloud-disable-button' ) ));
              } else {
                // We should never validate this condition
                console.error('Error in disableCloud with force option');
              }
              toaster.pop('error', $translate('CLOUDS.ERRORS.DISABLING_FAILED_TITLE'), $translate('CLOUDS.ERRORS.DISABLING_FAILED'), 4000, 'trustedHtml', null);
            }
            $scope.enablePending = false;
          }).error(function() {
            $scope.enablePending = false;
          });
      };

      $scope.refreshCloud = function() {
        $scope.refreshPending = true;
        cloudServices.refresh({
          id: $scope.cloud.id
        }, function(response) {
          $scope.refreshPending = true;
          if (response.data) {
            handleCloudResponse(response);
          } else {
            // toaster message
            toaster.pop('error', $translate('CLOUDS.ERRORS.REFRESHING_FAILED_TITLE'), $translate('CLOUDS.ERRORS.REFRESHING_FAILED'), 4000, 'trustedHtml', null);
          }
        }, function(response) {
          $scope.refreshPending = true;
          toaster.pop('error', $translate('CLOUDS.ERRORS.REFRESHING_FAILED_TITLE'), $translate('CLOUDS.ERRORS.REFRESHING_FAILED'), 4000, 'trustedHtml', null);
        });
      };

      $scope.cloudConfig = {};

      cloudServices.config.get({
        id: cloudId
      }, function(response) {
        if (_.defined(response.data)) {
          $scope.cloudConfig = response.data;
        }
      });

      // get the configuration for the cloud.
      $http.get('rest/formdescriptor/cloudConfig/' + cloudId).success(function(result) {
        $scope.cloudConfigDefinition = result.data;
      });

      $scope.saveConfiguration = function(newConfiguration) {
        return cloudServices.config.update({
          id: cloudId
        }, angular.toJson(newConfiguration), function success(response) {
          $scope.cloudConfig = newConfiguration;
          if (_.defined(response.error)) {
            var errorsHandle = $q.defer();
            return errorsHandle.resolve(response.error);
          } else {
            refreshCloud();
          }
        }).$promise;
      };

      //delete a cloud
      $scope.removeCloud = function(cloudId) {
        cloudServices.remove({
          id: cloudId
        }, function(response) {
          if (response.data === true) {
            $state.go('admin.clouds.list');
          } else {
            // toaster message
            toaster.pop('error', $translate('CLOUDS.ERRORS.DELETING_FAILED_TITLE'), $translate('CLOUDS.ERRORS.DELETING_FAILED'), 4000, 'trustedHtml', null);
          }
        });
      };

      $scope.closeErrorAlert = function() {
        $scope.actionErrors = null;
      };

      //get all deployments for this cloud
      deploymentServices.get({
        cloudId: cloudId,
        includeAppSummary: true
      }, function(result) {
        $scope.deployments = result.data;
      });

      // Handle cloud security action
      $scope.handleRoleSelectionForUser = function(user, role) {
        if (_.undefined($scope.cloud.userRoles)) {
          $scope.cloud.userRoles = {};
        }
        var cloudUserRoles = $scope.cloud.userRoles[user.username];
        if (!cloudUserRoles || cloudUserRoles.indexOf(role) < 0) {

          cloudServices.userRoles.addUserRole([], {
            cloudId: $scope.cloud.id,
            username: user.username,
            role: role
          }, function() {
            $scope.cloud.userRoles[user.username] = updateRoles(cloudUserRoles, role, 'add');
            if (!$scope.relatedUsers[user.username]) {
              $scope.relatedUsers[user.username] = user;
            }
          });

        } else {
          cloudServices.userRoles.removeUserRole([], {
            cloudId: $scope.cloud.id,
            username: user.username,
            role: role
          }, function() {
            $scope.cloud.userRoles[user.username] = updateRoles(cloudUserRoles, role, 'remove');
          });
        }
      };

      $scope.handleRoleSelectionForGroup = function(group, role) {
        if (_.undefined($scope.cloud.groupRoles)) {
          $scope.cloud.groupRoles = {};
        }
        var cloudGroupRoles = $scope.cloud.groupRoles[group.id];

        if (!cloudGroupRoles || cloudGroupRoles.indexOf(role) < 0) {
          cloudServices.groupRoles.addGroupRole([], {
            cloudId: $scope.cloud.id,
            groupId: group.id,
            role: role
          }, function() {
            $scope.cloud.groupRoles[group.id] = updateRoles(cloudGroupRoles, role, 'add');
            if (!$scope.relatedGroups[group.id]) {
              $scope.relatedGroups[group.id] = group;
            }
          });

        } else {
          cloudServices.groupRoles.removeGroupRole([], {
            cloudId: $scope.cloud.id,
            groupId: group.id,
            role: role
          }, function() {
            $scope.cloud.groupRoles[group.id] = updateRoles(cloudGroupRoles, role, 'remove');
          });
        }
      };

      $scope.checkCloudRoleSelectedForUser = function(user, role) {
        if ($scope.cloud && $scope.cloud.userRoles && $scope.cloud.userRoles[user.username]) {
          return $scope.cloud.userRoles[user.username].indexOf(role) > -1;
        }
        return false;
      };

      $scope.checkCloudRoleSelectedForGroup = function(group, role) {
        if ($scope.cloud && $scope.cloud.groupRoles && $scope.cloud.groupRoles[group.id]) {
          return $scope.cloud.groupRoles[group.id].indexOf(role) > -1;
        }
        return false;
      };

      var updateNetworkResourcesStatistic = function() {
        var result = updateResourcesStatistic($scope.paaSNetworkIds, $scope.networks);
        $scope.networkNotConfiguredCount = result.counter;
        $scope.availaiblePaaSNetworkIds = result.arr;
      };

      var updateComputeResourcesStatistic = function() {
        $scope.templateActiveCount = 0;
        for (var i = 0; i < $scope.cloud.computeTemplates.length; i++) {
          if ($scope.cloud.computeTemplates[i].enabled === true) {
            $scope.templateActiveCount++;
          }
        }
      };

      // generic fn that count the number of un-associated stuffs and define available PaaS IDs array
      var updateResourcesStatistic = function(paaSResourceIdArr, alienResourceMap) {
        var notConfiguredCount = 0;
        var availablePaaSResourceIdArr = null;
        if (paaSResourceIdArr) {
          // clone the array
          availablePaaSResourceIdArr = paaSResourceIdArr.slice(0);
        }
        angular.forEach(alienResourceMap, function(value) {
          if (_.undefined(value.paaSResourceId)) {
            notConfiguredCount++;
          } else if (paaSResourceIdArr) {
            // this resource id is mapped, not available for others
            _.pull(availablePaaSResourceIdArr, value.paaSResourceId);
          }
        });
        return {
          counter: notConfiguredCount,
          arr: availablePaaSResourceIdArr
        };
      };

      // count the number of images that are not associated to a resource id
      var updateImageResourcesStatistic = function() {
        var result = updateResourcesStatistic($scope.paaSImageIds, $scope.images);
        $scope.imageNotConfiguredCount = result.counter;
        $scope.availaiblePaaSImageIds = result.arr;
      };

      // count the number of flavors that are not associated to a resource id
      var updateFlavorResourcesStatistic = function() {
        var result = updateResourcesStatistic($scope.paaSFlavorIds, $scope.flavors);
        $scope.flavorNotConfiguredCount = result.counter;
        $scope.availaiblePaaSFlavorIds = result.arr;
      };

      // count the number of storages that are not associated to a resource id
      var updateStorageResourcesStatistic = function() {
        var result = updateResourcesStatistic($scope.paaSStorageIds, $scope.storages);
        $scope.storageNotConfiguredCount = result.counter;
        $scope.availaiblePaaSStorageIds = result.arr;
      };

      // count the number of zones that are not associated to a resource id
      var updateZoneResourcesStatistic = function() {
        var result = updateResourcesStatistic($scope.paaSZoneIds, $scope.zones);
        $scope.zoneNotConfiguredCount = result.counter;
        $scope.availaiblePaaSZoneIds = result.arr;
      };

      var updateComputeResources = function(cloudResources) {
        var newComputeTemplates = cloudResources.computeTemplates;
        $scope.tabs.newTemplates = newComputeTemplates.length - $scope.cloud.computeTemplates.length;
        $scope.cloud.computeTemplates = newComputeTemplates;
        updateComputeResourcesStatistic();
      };

      /** handle Modal form for cloud flavor creation */
      $scope.openFlavorCreationModal = function() {
        var modalInstance = $modal.open({
          templateUrl: 'views/clouds/new_flavor.html',
          controller: 'NewCloudImageFlavorController'
        });

        modalInstance.result.then(function(flavor) {
          cloudServices.addFlavor({
            id: $scope.cloud.id
          }, angular.toJson(flavor), function() {
            $scope.flavors[flavor.id] = {
              resource: flavor
            };
            $scope.cloud.flavors.push(flavor);
            updateFlavorResourcesStatistic();
          });
        });
      };

      $scope.deleteFlavor = function(flavorId) {
        cloudServices.removeFlavor({
          id: $scope.cloud.id,
          flavorId: flavorId
        }, undefined, function(success) {
          var indexFlavor = _.findByFieldValue($scope.cloud.flavors, 'id', flavorId);
          $scope.cloud.flavors.splice(indexFlavor, 1);
          delete $scope.flavors[flavorId];
          updateFlavorResourcesStatistic();
          updateComputeResources(success.data);
        });
      };

      /** handle Modal form for cloud network creation */
      $scope.openNetworkCreationModal = function() {
        var modalInstance = $modal.open({
          templateUrl: 'views/clouds/new_network.html',
          controller: 'NewNetworkController'
        });

        modalInstance.result.then(function(network) {
          network.id = network.networkName;
          cloudServices.addNetwork({
            id: $scope.cloud.id
          }, angular.toJson(network), function() {
            $scope.networks[network.id] = {
              resource: network
            };
            $scope.cloud.networks.push(network);
            updateNetworkResourcesStatistic();
          });
        });
      };

      /** handle Modal form for cloud storage creation */
      $scope.openStorageCreationModal = function() {
        var modalInstance = $modal.open({
          templateUrl: 'views/clouds/new_storage.html',
          controller: 'NewStorageController'
        });

        modalInstance.result.then(function(storage) {
          cloudServices.addStorage({
            id: $scope.cloud.id
          }, angular.toJson(storage), function() {
            $scope.storages[storage.id] = {
              resource: storage
            };
            $scope.cloud.storages.push(storage);
            updateStorageResourcesStatistic();
          });
        });
      };

      $scope.deleteNetwork = function(network) {
        cloudServices.removeNetwork({
          id: $scope.cloud.id,
          networkName: network.id
        }, undefined, function() {
          delete $scope.networks[network.id];
          _.pull($scope.cloud.networks, network);
          updateNetworkResourcesStatistic();
        });
      };

      $scope.deleteStorage = function(storage) {
        cloudServices.removeStorage({
          id: $scope.cloud.id,
          storageId: storage.id
        }, undefined, function() {
          delete $scope.storages[storage.id];
          _.pull($scope.cloud.storages, storage);
          updateStorageResourcesStatistic();
        });
      };

      $scope.selectTemplate = function(template) {
        $scope.selectedTemplate = template;
      };

      $scope.toggleEnableTemplate = function(template) {
        cloudServices.setCloudTemplateStatus({
          id: $scope.cloud.id,
          activableComputeId: template.id,
          enabled: !template.enabled
        }, undefined, function() {
          template.enabled = !template.enabled;
          updateComputeResourcesStatistic();
        });
      };

      function onResize(width, height) {
        $scope.heightInfo = {
          height: height
        };
        $scope.$apply();
      }

      resizeServices.register(onResize, 0, 0);
      $scope.heightInfo = {
        height: resizeServices.getHeight(0)
      };

      $scope.deleteTemplateSelection = function() {
        delete $scope.selectedTemplate;
      };

      $scope.removeCloudImage = function(imageId) {
        cloudServices.removeImage({
          id: $scope.cloud.id,
          imageId: imageId
        }, undefined, function(success) {
          _.pull($scope.cloud.images, imageId);
          delete $scope.images[imageId];
          updateImageResourcesStatistic();
          updateComputeResources(success.data);
          $scope.initSearchImageService();
        });
      };

      $scope.imageQueryProvider = {
        query: '',
        onSearchCompleted: function(searchResult) {
          $scope.searchImageData = searchResult.data;
        }
      };
      $scope.initSearchImageService = function() {
        $scope.searchImageService = searchServiceFactory('rest/cloud-images/search', false, $scope.imageQueryProvider, 5, undefined, undefined, undefined, {
          exclude: $scope.cloud.images
        });
        $scope.searchImage();
      };
      $scope.searchImage = function() {
        $scope.imageAddSelection = [];
        $scope.searchImageService.search();
      };
      $scope.imageQueryChanged = function(query) {
        $scope.imageQueryProvider.query = query;
      };

      $scope.switchCloudImageAddSelection = function(imageId) {
        if (_.contains($scope.imageAddSelection, imageId)) {
          _.pull($scope.imageAddSelection, imageId);
        } else {
          $scope.imageAddSelection.push(imageId);
        }
      };
      $scope.isInCloudImageAddSelection = function(imageId) {
        return _.contains($scope.imageAddSelection, imageId);
      };
      $scope.performAddCloudImageSelection = function() {
        cloudServices.addImage({
          id: $scope.cloud.id
        }, angular.toJson($scope.imageAddSelection), function() {
          // this is only ids
          angular.forEach($scope.imageAddSelection, function(value) {
            // we prefer add new images at the beginning
            $scope.cloud.images.unshift(value);
          });
          // add to the images details map
          angular.forEach($scope.searchImageData.data, function(value) {
            if (_.contains($scope.imageAddSelection, value.id)) {
              $scope.images[value.id] = {
                resource: value
              };
            }
          });
          $scope.imageAddSelection = [];
          updateImageResourcesStatistic();
          $scope.initSearchImageService();
        });
      };

      $scope.onImageDragged = function(dragEvent) {
        var imageId = angular.fromJson(dragEvent.source);
        $scope.imageAddSelection = [imageId];
        $scope.performAddCloudImageSelection();
      };

      $scope.createCloudImage = function() {
        var modalInstance = $modal.open({
          templateUrl: 'views/cloud-images/new_cloud_image.html',
          controller: 'NewCloudImageController',
          windowClass: 'newImageModal'
        });

        modalInstance.result.then(function(cloudImageId) {

          cloudImageServices.get({
            id: cloudImageId
          }, function(success) {
            $scope.images[success.data.id] = {
              resource: success.data
            };
            cloudServices.addImage({
              id: $scope.cloud.id
            }, angular.toJson([cloudImageId]), function() {
              $scope.cloud.images = _.concat($scope.cloud.images, [cloudImageId]);
              updateImageResourcesStatistic();
            });
          });
        });
      };

      // associate a PaaS resource id to a cloud image
      $scope.saveImageResourceId = function(cloudImageId, paaSResourceId) {
        savePasSResourceId(
          cloudImageId,
          $scope.images,
          paaSResourceId,
          cloudServices.setCloudImageResource,
          function(result) {
            updateImageResourcesStatistic();
            updateComputeResources(result.data);
          }
        );
      };

      // associate a PaaS resource id to a cloud flavor
      $scope.saveFlavorResourceId = function(cloudFlavorId, paaSResourceId) {
        savePasSResourceId(
          cloudFlavorId,
          $scope.flavors,
          paaSResourceId,
          cloudServices.setCloudFlavorResource,
          function(result) {
            updateFlavorResourcesStatistic();
            updateComputeResources(result.data);
          }
        );
      };

      // associate a PaaS resource id to a cloud network
      $scope.saveNetworkResourceId = function(cloudNetworkId, paaSResourceId) {
        savePasSResourceId(
          cloudNetworkId,
          $scope.networks,
          paaSResourceId,
          cloudServices.setCloudNetworkResource,
          updateNetworkResourcesStatistic);
      };

      // associate a PaaS resource id to a cloud storage
      $scope.saveStorageResourceId = function(cloudStorageId, paaSResourceId) {
        savePasSResourceId(
          cloudStorageId,
          $scope.storages,
          paaSResourceId,
          cloudServices.setCloudStorageResource,
          updateStorageResourcesStatistic);
      };

      // associate a PaaS resource id to a cloud zone
      $scope.saveZoneResourceId = function(cloudZoneId, paaSResourceId) {
        savePasSResourceId(
          cloudZoneId,
          $scope.zones,
          paaSResourceId,
          cloudServices.setCloudZoneResource,
          updateZoneResourcesStatistic);
      };

      // a generic fn that associate an internal resource to a PaaS resource
      var savePasSResourceId = function(alienResourceId, alienResourceArray, paaSResourceId, saveFn, callbackFn) {
        if (_.undefined(paaSResourceId) || paaSResourceId === '') {
          if (alienResourceArray[alienResourceId]) {
            delete alienResourceArray[alienResourceId].paaSResourceId;
          }
        } else {
            alienResourceArray[alienResourceId].paaSResourceId = paaSResourceId;
        }
        saveFn({
          id: $scope.cloud.id,
          resourceId: alienResourceId,
          pasSResourceId: paaSResourceId
        }, undefined, function(result) {
          callbackFn(result);
        });
      };

      var ModalInstanceCtrl = ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.title = 'CLOUDS.ADMINISTRATION.HELP.TITLE';
        $scope.content = $filter('translate')('CLOUDS.ADMINISTRATION.HELP.CONTENT');
        $scope.close = function () {
          $modalInstance.dismiss('close');
        };
      }];

      $scope.openSimpleModal = function () {
        $modal.open({
          templateUrl: 'views/common/simple_modal.html',
          controller: ModalInstanceCtrl
        });
      };

      /** handle Modal form for cloud zone creation */
      $scope.openZoneCreationModal = function() {
        var modalInstance = $modal.open({
          templateUrl: 'views/clouds/new_zone.html',
          controller: 'NewZoneController'
        });

        modalInstance.result.then(function(zone) {
          cloudServices.addZone({
            id: $scope.cloud.id
          }, angular.toJson(zone), function() {
            $scope.zones[zone.id] = {
                resource: zone
            };
            $scope.cloud.availabilityZones.push(zone);
            updateZoneResourcesStatistic();
          });
        });
      };

      $scope.deleteZone = function(zone) {
        cloudServices.removeZone({
          id: $scope.cloud.id,
          zoneId: zone.id
        }, undefined, function() {
          delete $scope.zones[zone.id];
          _.pull($scope.cloud.availabilityZones, zone);
          updateZoneResourcesStatistic();
        });
      };

      $scope.loadConfigurationTag = function() {
        // filter only by target 'cloud'
        var filterCloud = {};
        filterCloud.target = [];
        filterCloud.target.push('cloud');

        var searchRequestObject = {
          'query': '',
          'filters': filterCloud,
          'from': 0,
          'size': 50
        };

        metapropConfServices.search([], angular.toJson(searchRequestObject), function(successResult) {
          $scope.configurationProperties = successResult.data.data;
        });
      };
      $scope.loadConfigurationTag();
    }
  ]);
});
