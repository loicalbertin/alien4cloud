// Topology editor controller
define(function (require) {
  'use strict';

  var modules = require('modules');
  var _ = require('lodash');

  require('scripts/tosca/services/tosca_service');
  require('scripts/tosca/services/relationship_target_matcher_service');
  require('scripts/components/directives/search_relationship_type');

  modules.get('a4c-topology-editor', ['a4c-common', 'ui.bootstrap', 'toaster', 'pascalprecht.translate', 'a4c-tosca']).controller('SearchRelationshipCtrl',
    ['$scope', '$modalInstance', 'relationshipMatchingService', 'toscaService',
    function($scope, $modalInstance, relationshipMatchingService, toscaService) {
    $scope.totalStep = 3;
    $scope.step = 1;

    $scope.relationshipModalData = {};

    relationshipMatchingService.getTargets($scope.sourceElementName, $scope.requirement, $scope.requirementName, $scope.topology.topology.nodeTemplates,
        $scope.topology.nodeTypes, $scope.topology.relationshipTypes, $scope.topology.capabilityTypes, $scope.topology.topology.dependencies,
        $scope.targetNodeTemplateName).then(function(result) {
      $scope.targets = result.targets;
      $scope.relationshipModalData.relationship = result.relationshipType;
      if (result.preferedMatch !== null) {
        // pre-select the target node if a single capability matches.
        if (result.preferedMatch.capabilities.length === 1) {
          $scope.onSelectedTarget(result.preferedMatch.template.name, result.preferedMatch.capabilities[0].id);
        }
      }
    });

    $scope.onSelectedRelationship = function(relationship) {
      $scope.relationshipModalData.relationship = relationship;
      $scope.relationshipModalData.name = toscaService.generateRelationshipName($scope.relationshipModalData.relationship.elementId,
          $scope.relationshipModalData.target);
      $scope.next();
    };

    $scope.onSelectedTarget = function(targetName, capabilityName) {
      $scope.relationshipModalData.target = targetName;
      $scope.relationshipModalData.targetedCapabilityName = capabilityName;

      // filter on valid targets
      if(capabilityName) {
        // TODO should we manage inheritance here ?
        var validTargets = [$scope.topology.topology.nodeTemplates[targetName].capabilitiesMap[capabilityName].value.type];
        $scope.relationshipHiddenFilters = [{
          term: 'validTargets',
          facet: validTargets
        }];
      }

      $scope.next();
      // if a relationship has already been provided skip the relationship search.
      if($scope.relationshipModalData.relationship) {
        $scope.next();
        $scope.relationshipModalData.name = toscaService.generateRelationshipName($scope.relationshipModalData.relationship.elementId,
            $scope.relationshipModalData.target);
      }
    };

    $scope.finish = function() {
      $modalInstance.close($scope.relationshipModalData);
    };

    $scope.next = function() {
      $scope.step = $scope.step + 1;
    };

    $scope.back = function() {
      $scope.step = $scope.step - 1;
    };

    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };

    $scope.mustDisableFinish = function() {
      return _.undefined($scope.relationshipModalData.relationship) || _.undefined($scope.relationshipModalData.target) || _.undefined($scope.relationshipModalData.name);
    };
  }]); // controller
}); // define
