Feature: Deployment setup feature.

  Background:
    Given I am authenticated with "ADMIN" role
    And I upload a plugin
    And I create a cloud with name "Mount doom cloud" and plugin id "alien4cloud-mock-paas-provider:1.0" and bean name "mock-paas-provider"
    And I enable the cloud "Mount doom cloud"
    And I upload the archive "tosca-normative-types"
    And I upload the archive "alien-base-types"
    And I upload the archive "alien-extended-storage-types"
    And I should receive a RestResponse with no error
    And I add a role "APPLICATIONS_MANAGER" to user "sangoku"
    And I add a role "CLOUD_DEPLOYER" to user "sangoku" on the resource type "CLOUD" named "Mount doom cloud"
    And I have already created a cloud image with name "Windows 7", architecture "x86_64", type "windows", distribution "Windows" and version "7.0"
    And I have already created a cloud image with name "Ubuntu Trusty", architecture "x86_64", type "linux", distribution "Ubuntu" and version "14.04.1"
    And I add the cloud image "Windows 7" to the cloud "Mount doom cloud" and match it to paaS image "WINDOWS"
    And I add the cloud image "Ubuntu Trusty" to the cloud "Mount doom cloud" and match it to paaS image "UBUNTU"
    And I add the flavor with name "small", number of CPUs 2, disk size 32 and memory size 2048 to the cloud "Mount doom cloud" and match it to paaS flavor "2"
    And I add the flavor with name "medium", number of CPUs 4, disk size 64 and memory size 4096 to the cloud "Mount doom cloud" and match it to paaS flavor "3"
    And I add the network with name "private" and CIDR "192.168.1.0/24" and IP version 4 and gateway "192.168.1.1" to the cloud "Mount doom cloud"
    And I add the network with name "public" and CIDR "192.168.2.0/24" and IP version 4 and gateway "192.168.2.1" to the cloud "Mount doom cloud"
    And I add the storage with id "STORAGE1" and device "/etc/dev1" and size 1024 to the cloud "Mount doom cloud"
    And I match the network with name "private" of the cloud "Mount doom cloud" to the PaaS resource "alienPrivateNetwork"
    And I match the network with name "public" of the cloud "Mount doom cloud" to the PaaS resource "alienPublicNetwork"
    And I add the availability zone with id "paris" and description "Data-center at Paris" to the cloud "Mount doom cloud"
    And I add the availability zone with id "toulouse" and description "Data-center at Toulouse" to the cloud "Mount doom cloud"
    And I match the availability zone with name "paris" of the cloud "Mount doom cloud" to the PaaS resource "paris-zone"
    And I match the availability zone with name "toulouse" of the cloud "Mount doom cloud" to the PaaS resource "toulouse-zone"
    And I have an application "ALIEN" with a topology containing a nodeTemplate "Compute" related to "tosca.nodes.Compute:1.0.0.wd03-SNAPSHOT"
    And I add a node template "Network" related to the "tosca.nodes.Network:1.0.0.wd03-SNAPSHOT" node type
    And I add a node template "ConfigurableBlockStorage" related to the "alien.nodes.ConfigurableBlockStorage:1.0-SNAPSHOT" node type
    And I assign the cloud with name "Mount doom cloud" for the application

  Scenario: Select a compute template for a node
    When I select the template composed of image "Ubuntu Trusty" and flavor "medium" for my node "Compute"
    Then I should receive a RestResponse with no error
    And The deployment setup of the application should contain following resources mapping:
      | Compute | Ubuntu Trusty | medium |

  Scenario: Modify node template's name, property and the deployment setup should be updated with the modification
    When I select the template composed of image "Ubuntu Trusty" and flavor "medium" for my node "Compute"
    Then I should receive a RestResponse with no error
    And The deployment setup of the application should contain following resources mapping:
      | Compute | Ubuntu Trusty | medium |
    When I update the node template's name from "Compute" to "NewCompute"
    And I update the node template "NewCompute"'s property "os_type" to "linux"
    Then The deployment setup of the application should contain following resources mapping:
      | NewCompute | Ubuntu Trusty | small |
    When I select the template composed of image "Ubuntu Trusty" and flavor "medium" for my node "Compute"
    And I update the node template "NewCompute"'s property "os_type" to "windows"
    Then The deployment setup of the application should contain following resources mapping:
      | NewCompute | Windows 7 | small |
    And I update the node template "NewCompute"'s property "os_version" to "unknown_os_version"
    Then The deployment setup of the application should contain no resources mapping

  Scenario: Select a network for a node
    When I select the network with name "private" for my node "Network"
    Then I should receive a RestResponse with no error
    And The deployment setup of the application should contain following network mapping:
      | Network | private | 192.168.1.0/24 | 4 | 192.168.1.1 |

  Scenario: Modify network's property and see that the mapping is automatically updated
    When I select the network with name "private" for my node "Network"
    Then I should receive a RestResponse with no error
    And The deployment setup of the application should contain following network mapping:
      | Network | private | 192.168.1.0/24 | 4 | 192.168.1.1 |
    When I update the node template's name from "Network" to "NewNetwork"
    And I update the node template "NewNetwork"'s property "cidr" to "192.168.2.0/24"
    Then The deployment setup of the application should contain following network mapping:
      | NewNetwork | public | 192.168.2.0/24 | 4 | 192.168.2.1 |
    When I update the node template "NewNetwork"'s property "gateway_ip" to "192.168.1.1"
    Then The deployment setup of the application should contain an empty network mapping
    When I update the node template "NewNetwork"'s property "gateway_ip" to "192.168.2.1"
    Then The deployment setup of the application should contain following network mapping:
      | NewNetwork | public | 192.168.2.0/24 | 4 | 192.168.2.1 |

  Scenario: Select a storage for a node
    When I select the storage with name "STORAGE1" for my node "ConfigurableBlockStorage"
    Then I should receive a RestResponse with no error
    And The deployment setup of the application should contain following storage mapping:
      | ConfigurableBlockStorage | STORAGE1 | /etc/dev1 | 1024 |

  Scenario: Modify storage's property and see that the mapping is automatically updated
    When I select the storage with name "STORAGE1" for my node "ConfigurableBlockStorage"
    Then I should receive a RestResponse with no error
    And The deployment setup of the application should contain following storage mapping:
      | ConfigurableBlockStorage | STORAGE1 | /etc/dev1 | 1024 |
    When I update the node template's name from "ConfigurableBlockStorage" to "NewConfigurableBlockStorage"
    And The deployment setup of the application should contain following storage mapping:
      | NewConfigurableBlockStorage | STORAGE1 | /etc/dev1 | 1024 |
    When I update the node template "NewConfigurableBlockStorage"'s property "device" to "/etc/dev2"
    Then The deployment setup of the application should contain an empty storage mapping

  Scenario: Select an availability zone for a group
    When I add a node template "Compute1" related to the "tosca.nodes.Compute:1.0.0.wd03-SNAPSHOT" node type
    And I add a node template "Compute2" related to the "tosca.nodes.Compute:1.0.0.wd03-SNAPSHOT" node type
    And I add a group with name "HA_group" whose members are "Compute1,Compute2"
    And I select the availability zone with name "paris" for my group "HA_group"
    Then I should receive a RestResponse with no error
    And The deployment setup of the application should contain following availability zone mapping:
      | HA_group | paris    | Data-center at Paris    |
      | HA_group | toulouse | Data-center at Toulouse |