package alien4cloud.it.setup;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

import org.apache.commons.lang3.StringUtils;

import com.google.common.collect.Maps;

@Slf4j
public class TestDataRegistry {

    /**
     * This map contains artifacts that need to be zipped in prepare test data phase PrepareTestData.main
     * it's a map of input folder --> zip path
     */
    public static final Map<Path, Path> SOURCE_TO_TARGET_ARTIFACT_MAPPING = Maps.newHashMap();

    /**
     * This map contains artifacts that is required for IT test
     * it's a map of human readable artifact name --> zip path
     */
    public static final Map<String, Path> TEST_ARTIFACTS = Maps.newHashMap();

    /**
     * This property is injected by fail safe plugin, it contains the directory of test project
     */
    public static final Path BASE_DIR;

    static {
        String basedir = System.getProperty("basedir");
        if (StringUtils.isEmpty(basedir)) {
            // Test from IDE
            basedir = ".";
        }
        BASE_DIR = Paths.get(basedir).normalize().toAbsolutePath();
    }
    /**
     * The parent project, it's where all artifacts are stored
     */
    public static final Path A4C_DIR = BASE_DIR.getParent();

    /**
     * The path where all it artifacts are stored
     */
    public static final Path IT_ARTIFACTS_DIR = A4C_DIR.resolve("target").resolve("it-artifacts");

    public static final String GIT_ARTIFACTS_PATH = "target/git/";

    /**
     * All artifacts that comes from git will be put here
     */
    public static final Path GIT_ARTIFACTS_DIR = BASE_DIR.resolve(GIT_ARTIFACTS_PATH);

    static {
        addConditionFolder("tosca base types 1.0", "src/test/resources/data/csars/tosca-base-types-1.0");
        addConditionFolder("tosca base types 2.0", "src/test/resources/data/csars/tosca-base-types-2.0");
        addConditionFolder("tosca base types 3.0", "src/test/resources/data/csars/tosca-base-types-3.0");
        addConditionFolder("sample java types 1.0", "src/test/resources/data/csars/sample/java-types-1.0");
        addConditionFolder("sample java types 2.0", "src/test/resources/data/csars/sample/java-types-2.0");
        addConditionFolder("sample java types 3.0", "src/test/resources/data/csars/sample/java-types-3.0");

        addConditionFolder("ubuntu types 0.1", "src/test/resources/data/csars/sample/ubuntu-types-0.1");
        addConditionFolder("sample apache lb types 0.1", "src/test/resources/data/csars/sample/apache-lb-types-0.1");
        addConditionFolder("sample apache lb types 0.2", "src/test/resources/data/csars/sample/apache-lb-types-0.2");

        addConditionFolder("constraints", "src/test/resources/data/csars/definition/constraints");
        addConditionFolder("invalid (definition file not found)", "src/test/resources/data/csars/definition/missing");
        addConditionFolder("invalid (definition file is not valid yaml file)", "src/test/resources/data/csars/definition/erroneous");
        addConditionFolder("invalid (definition file's declaration duplicated)", "src/test/resources/data/csars/definition/duplicated");
        addConditionFolder("invalid (ALIEN-META.yaml not found)", "src/test/resources/data/csars/metadata/missing");
        addConditionFolder("invalid (ALIEN-META.yaml invalid)", "src/test/resources/data/csars/metadata/erroneous");
        addConditionFolder("invalid (ALIEN-META.yaml fail validation)", "src/test/resources/data/csars/metadata/validationFailure");
        addConditionFolder("invalid (icon not found)", "src/test/resources/data/csars/icon/missing");
        addConditionFolder("invalid (icon invalid)", "src/test/resources/data/csars/icon/erroneous");
        addConditionFolder("snapshot", "src/test/resources/data/csars/snapshot");
        addConditionFolder("relationship test types", "src/test/resources/data/csars/relationship-test-types");
        addConditionFolder("valid-csar-with-test", "src/test/resources/data/csars/snapshot-test/snapshot-test-valid");
        addConditionFolder("valid-csar-with-update1", "src/test/resources/data/csars/snapshot-test/snapshot-test-update1");
        addConditionFolder("valid-csar-with-update2", "src/test/resources/data/csars/snapshot-test/snapshot-test-update2");
        addConditionFolder("valid-csar-with-update3", "src/test/resources/data/csars/snapshot-test/snapshot-test-update3");
        addConditionFolder("csar-test-no-topology", "src/test/resources/data/csars/snapshot-test/missing-topology-yaml");

        addConditionFolder("topology-singlecompute", "src/test/resources/data/csars/topology_template/topology-singlecompute");
        addConditionFolder("topology apache", "src/test/resources/data/csars/topology_template/topology-apache-it");
        addConditionFolder("topology custom types", "src/test/resources/data/csars/topology_template/topology-custom-types");
        addConditionFolder("topology-error-missingtype", "src/test/resources/data/csars/topology_template/topology-error-missingtype");
        addConditionFolder("topology-unknown-req", "src/test/resources/data/csars/topology_template/topology-unknown-req");
        addConditionFolder("topology-unknown-reqtarget", "src/test/resources/data/csars/topology_template/topology-unknown-reqtarget");
        addConditionFolder("topology-unknown-capability", "src/test/resources/data/csars/topology_template/topology-unknown-capability");
        addConditionFolder("topology-unknown-capability-short-notation",
                "src/test/resources/data/csars/topology_template/topology-unknown-capability-short-notation");
        addConditionFolder("topology-unknown-relationshiptype", "src/test/resources/data/csars/topology_template/topology-unknown-relationshiptype");
        addConditionFolder("topology_inputs", "src/test/resources/data/csars/topology_template/topology_inputs");
        addConditionFolder("topology_outputs", "src/test/resources/data/csars/topology_template/topology_outputs");
        addConditionFolder("topology-capacility-prop", "src/test/resources/data/csars/topology_template/topology-capacility-prop");
        addConditionFolder("topology-capacility-prop-unkown", "src/test/resources/data/csars/topology_template/topology-capacility-prop-unkown");
        addConditionFolder("topology-capacility-unkown", "src/test/resources/data/csars/topology_template/topology-capacility-unkown");
        addConditionFolder("topology-template-relationship-funtionprop",
                "src/test/resources/data/csars/topology_template/topology-template-relationship-funtionprop");
        addConditionFolder("topology-capability-io", "src/test/resources/data/csars/topology_template/topology-capability-io");
        addConditionFolder("topology_artifact", "src/test/resources/data/csars/topology_template/topology_artifact");
        addConditionFolder("topology-groups", "src/test/resources/data/csars/topology_template/topology-groups");
        addConditionFolder("topology-groups-unknown-policy", "src/test/resources/data/csars/topology_template/topology-groups-unknown-policy");
        addConditionFolder("topology-groups-unknown-member", "src/test/resources/data/csars/topology_template/topology-groups-unknown-member");

        addConditionFolder("tosca-normative-types", GIT_ARTIFACTS_PATH + "tosca-normative-types");
        addConditionFolder("alien-base-types", GIT_ARTIFACTS_PATH + "alien4cloud-extended-types/alien-base-types-1.0-SNAPSHOT");
        addConditionFolder("alien-extended-storage-types", GIT_ARTIFACTS_PATH + "alien4cloud-extended-types/alien-extended-storage-types-1.0-SNAPSHOT");
        addConditionFolder("samples tomcat-war", GIT_ARTIFACTS_PATH + "samples/tomcat-war");
        addConditionFolder("samples apache", GIT_ARTIFACTS_PATH + "samples/apache");
        addConditionFolder("samples wordpress", GIT_ARTIFACTS_PATH + "samples/wordpress");
        addConditionFolder("samples mysql", GIT_ARTIFACTS_PATH + "samples/mysql");
        addConditionFolder("samples php", GIT_ARTIFACTS_PATH + "samples/php");
        addConditionFolder("samples topology wordpress", GIT_ARTIFACTS_PATH + "samples/topology-wordpress");
        addConditionFolder("samples topology tomcat-war", GIT_ARTIFACTS_PATH + "samples/topology-tomcatWar");

        // We put all artifacts to a4c root project dir
        // test uploading an unzipped file (do not zip it)
        TEST_ARTIFACTS.put("unzipped", BASE_DIR.resolve("src/test/resources/alien/rest/csars/upload.feature"));
    }

    public static void addConditionFolder(String condition, String folderPathStr) {
        // We put all artifacts to a4c root project dir
        Path folderPath = BASE_DIR.resolve(folderPathStr);
        Path zipPath = IT_ARTIFACTS_DIR.resolve(folderPath.getFileName() + ".csar");
        SOURCE_TO_TARGET_ARTIFACT_MAPPING.put(folderPath, zipPath);
        TEST_ARTIFACTS.put(condition, zipPath);
    }
}
