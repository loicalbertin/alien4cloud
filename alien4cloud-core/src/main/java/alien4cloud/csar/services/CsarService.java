package alien4cloud.csar.services;

import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.annotation.Resource;

import org.elasticsearch.index.query.FilterBuilder;
import org.elasticsearch.index.query.FilterBuilders;
import org.elasticsearch.index.query.QueryBuilders;
import org.springframework.stereotype.Component;

import alien4cloud.component.ICSARRepositoryIndexerService;
import alien4cloud.component.repository.CsarFileRepository;
import alien4cloud.dao.IGenericSearchDAO;
import alien4cloud.dao.model.GetMultipleDataResult;
import alien4cloud.exception.DeleteReferencedObjectException;
import alien4cloud.exception.NotFoundException;
import alien4cloud.model.components.CSARDependency;
import alien4cloud.model.components.Csar;
import alien4cloud.model.topology.Topology;

import com.google.common.collect.Maps;
import com.google.common.collect.Sets;

/**
 * Manages cloud services archives and their dependencies.
 */
@Component
public class CsarService implements ICsarDependencyLoader {
    @Resource(name = "alien-es-dao")
    private IGenericSearchDAO csarDAO;

    @Resource
    private ICSARRepositoryIndexerService indexerService;

    @Resource
    private CsarFileRepository alienRepository;

    /**
     * Get a cloud service if exists in Dao.
     * 
     * @param name The name of the archive.
     * @param version The version of the archive.
     * @return The {@link Csar Cloud Service Archive} if found in the repository or null.
     */
    public Csar getIfExists(String name, String version) {
        Csar csar = new Csar();
        csar.setName(name);
        csar.setVersion(version);
        csar = csarDAO.findById(Csar.class, csar.getId());
        return csar;
    }

    @Override
    public Set<CSARDependency> getDependencies(String name, String version) {
        Csar csar = getIfExists(name, version);
        if (csar == null) {
            throw new NotFoundException("Csar with name [" + name + "] and version [" + version + "] cannot be found");
        }
        if (csar.getDependencies() == null || csar.getDependencies().isEmpty()) {
            return Sets.newHashSet();
        }
        return Sets.newHashSet(csar.getDependencies());
    }

    /**
     * @return an array of CSARs that depend on this name:version.
     */
    public Csar[] getDependantCsars(String name, String version) {
        FilterBuilder filter = FilterBuilders.nestedFilter(
                "dependencies",
                FilterBuilders.boolFilter().must(FilterBuilders.termFilter("dependencies.name", name))
                        .must(FilterBuilders.termFilter("dependencies.version", version)));
        GetMultipleDataResult<Csar> result = csarDAO.search(Csar.class, null, null, filter, null, 0, Integer.MAX_VALUE);
        return result.getData();
    }

    /**
     * @return an array of <code>Topology</code>s that depend on this name:version.
     */
    public Topology[] getDependantTopologies(String name, String version) {
        FilterBuilder filter = FilterBuilders.nestedFilter(
                "dependencies",
                FilterBuilders.boolFilter().must(FilterBuilders.termFilter("dependencies.name", name))
                        .must(FilterBuilders.termFilter("dependencies.version", version)));
        GetMultipleDataResult<Topology> result = csarDAO.search(Topology.class, null, null, filter, null, 0, Integer.MAX_VALUE);
        return result.getData();
    }
    
    /**
     * Save a Cloud Service Archive in ElasticSearch.
     * 
     * @param csar The csar to save.
     */
    public void save(Csar csar) {
        // fill in transitive dependencies.
        Set<CSARDependency> mergedDependencies = null;
        if (csar.getDependencies() != null) {
            mergedDependencies = Sets.newHashSet(csar.getDependencies());
            for (CSARDependency dependency : csar.getDependencies()) {
                Csar dependencyCsar = getIfExists(dependency.getName(), dependency.getVersion());
                if (dependencyCsar != null && dependencyCsar.getDependencies() != null) {
                    mergedDependencies.addAll(dependencyCsar.getDependencies());
                }
            }
        }
        csar.setDependencies(mergedDependencies);

        this.csarDAO.save(csar);
    }

    public Map<String, Csar> findByIds(String fetchContext, String... ids) {
        Map<String, Csar> csarMap = Maps.newHashMap();
        List<Csar> csars = csarDAO.findByIdsWithContext(Csar.class, fetchContext, ids);
        for (Csar csar : csars) {
            csarMap.put(csar.getId(), csar);
        }
        return csarMap;
    }

    public Csar getMandatoryCsar(String csarId) {
        Csar csar = csarDAO.findById(Csar.class, csarId);
        if (csar == null) {
            throw new NotFoundException("Csar with id [" + csarId + "] do not exist");
        } else {
            return csar;
        }
    }

    public void deleteCsar(String name, String version) {
        deleteCsar(new Csar(name, version).getId());
    }

    /**
     * @return true if the CSar is a dependency for another or used in a topology.
     */
    public boolean isDependency(String csarName, String csarVersion) {
        // a csar that is a dependency of another csar
        Csar[] result = getDependantCsars(csarName, csarVersion);
        if (result != null && result.length > 0) {
            return true;
        }
        // check if some of the nodes are used in topologies.
        Topology[] topologies = getDependantTopologies(csarName, csarVersion);
        if (topologies != null && topologies.length > 0) {
            return true;
        }
        return false;
    }

    public void deleteCsar(String csarId) {
        deleteCsar(csarId, false);
    }

    public void deleteCsar(String csarId, boolean ignoreSubtisutionTopology) {
        Csar csar = getMandatoryCsar(csarId);
        // a csar that is a dependency of another csar can not be deleted
        if (isDependency(csar.getName(), csar.getVersion())) {
            throw new DeleteReferencedObjectException("This csar can not be deleted since it's a dependencie for others");
        }

        // here we check that the csar is not a csar created by a topology template (substitution).
        if (!ignoreSubtisutionTopology && csar.getSubstitutionTopologyId() != null) {
            String linkedTopologyId = csar.getSubstitutionTopologyId();
            Topology topology = csarDAO.findById(Topology.class, linkedTopologyId);
            if (topology != null) {
                throw new DeleteReferencedObjectException(
                        "The CSAR with id <"
                                + csarId
                                + "> is linked to a topology template (substitution) and can not be deleted by this way. The archive can be deleted by deleting the related topology template version.");
            }
        }

        // latest version indicator will be recomputed to match this new reality
        indexerService.deleteElements(csar.getName(), csar.getVersion());

        csarDAO.delete(Csar.class, csarId);

        // physically delete files
        alienRepository.removeCSAR(csar.getName(), csar.getVersion());

    }

    public Csar getTopologySubstitutionCsar(String topologyId) {
        Csar csarResult = csarDAO.customFind(Csar.class, QueryBuilders.termQuery("substitutionTopologyId", topologyId));
        if (csarResult != null) {
            return csarResult;
        } else {
            return null;
        }
    }

}
