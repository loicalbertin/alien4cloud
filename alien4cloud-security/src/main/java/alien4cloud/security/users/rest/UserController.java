package alien4cloud.security.users.rest;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletResponse;
import javax.validation.Valid;

import org.apache.commons.lang3.ArrayUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;

import alien4cloud.audit.annotation.Audit;
import alien4cloud.dao.model.FacetedSearchResult;
import alien4cloud.dao.model.GetMultipleDataResult;
import alien4cloud.rest.model.RestErrorBuilder;
import alien4cloud.rest.model.RestErrorCode;
import alien4cloud.rest.model.RestResponse;
import alien4cloud.rest.model.RestResponseBuilder;
import alien4cloud.security.ResourceRoleService;
import alien4cloud.security.groups.GroupService;
import alien4cloud.security.model.Role;
import alien4cloud.security.model.User;
import alien4cloud.security.users.IAlienUserDao;
import alien4cloud.security.users.UserService;

import com.google.common.collect.Sets;
import com.wordnik.swagger.annotations.ApiOperation;

/**
 * UserController allows ALIEN administrators to create, delete, update, or search users.
 *
 * @author luc boutier
 */
@Component
@RestController
@RequestMapping("/rest/users")
public class UserController {
    @Resource
    private IAlienUserDao alienUserDao;
    @Resource
    private UserService userService;
    @Resource
    private GroupService groupService;
    @Resource
    private ResourceRoleService resourceRoleService;

    /**
     * Create a new user in the system.
     *
     * @param request The new user to create.
     * @return an empty (void) rest {@link RestResponse}.
     */
    @ApiOperation(value = "Create a new user in ALIEN.")
    @RequestMapping(method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Audit
    public RestResponse<Void> create(@Valid @RequestBody CreateUserRequest request) {
        userService.createUser(request.getUsername(), request.getEmail(), request.getFirstName(), request.getLastName(), request.getRoles(),
                request.getPassword());
        return RestResponseBuilder.<Void> builder().build();
    }

    @ApiOperation("Update an user by merging the userUpdateRequest into the existing user")
    @RequestMapping(value = "/{username}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Audit
    public RestResponse<Void> update(@PathVariable String username, @RequestBody UpdateUserRequest userUpdateRequest) {
        userService.updateUser(username, userUpdateRequest);
        return RestResponseBuilder.<Void> builder().build();
    }

    /**
     * Get a user from it's username.
     *
     * @param username The unique username of the user to retrieve.
     * @return The user matching the requested username.
     */
    @ApiOperation(value = "Get a user based on it's username.", notes = "Returns a rest response that contains the user's details.")
    @RequestMapping(value = "/{username}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public RestResponse<User> getUser(@PathVariable String username) {
        if (username == null || username.isEmpty()) {
            return RestResponseBuilder.<User> builder()
                    .error(RestErrorBuilder.builder(RestErrorCode.ILLEGAL_PARAMETER).message("username cannot be null or empty").build()).build();
        }
        User user = alienUserDao.find(username);
        if (user != null) {
            user.setPassword(null);
        }
        return RestResponseBuilder.<User> builder().data(user).build();
    }

    /**
     * Get multiple users from their usernames.
     *
     * @param usernames The list of unique usernames of the user to retrieve.
     * @return The users matching the given usernames.
     */
    @ApiOperation(value = "Get multiple users from their usernames.", notes = "Returns a rest response that contains the list of requested users.")
    @RequestMapping(value = "/getUsers", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public RestResponse<List<User>> getUsers(@RequestBody List<String> usernames) {
        if (usernames == null || usernames.isEmpty()) {
            return RestResponseBuilder.<List<User>> builder()
                    .error(RestErrorBuilder.builder(RestErrorCode.ILLEGAL_PARAMETER).message("usernames cannot be null or empty").build()).build();
        }

        List<User> users = alienUserDao.find(usernames.toArray(new String[0]));
        return RestResponseBuilder.<List<User>> builder().data(users).build();
    }

    /**
     * Delete a user from the store based on it's username.
     *
     * @param username The unique username of the user to delete.
     * @return an empty (void) rest {@link RestResponse}.
     */
    @ApiOperation(value = "Delete an existing user from the internal user's repository.")
    @RequestMapping(value = "/{username}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Audit
    public RestResponse<Void> deleteUser(@PathVariable String username, HttpServletResponse servletResponse) throws IOException, ClassNotFoundException {
        if (username == null || username.isEmpty()) {
            return RestResponseBuilder.<Void> builder()
                    .error(RestErrorBuilder.builder(RestErrorCode.ILLEGAL_PARAMETER).message("username cannot be null or empty").build()).build();
        } else if (alienUserDao.find(username) == null) {
            return RestResponseBuilder.<Void> builder().build();
        } else if (userService.isAdmin(username) && userService.countAdminUser() == 1) {
            servletResponse.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
            return RestResponseBuilder
                    .<Void> builder()
                    .error(RestErrorBuilder.builder(RestErrorCode.DELETE_LAST_ADMIN_USER_ERROR).message("It's forbidden to remove the last admin user.")
                            .build()).build();
        }

        resourceRoleService.deleteUserRoles(username);
        groupService.removeUserFromAllGroup(username);

        alienUserDao.delete(username);
        return RestResponseBuilder.<Void> builder().build();
    }

    /**
     * Search for users.
     *
     * @param searchRequest The request that contains parameters of the search request.
     * @return A {@link RestResponse} that contains a {@link GetMultipleDataResult} of {@link User}.
     */
    @ApiOperation(value = "Search for user's registered in alien.")
    @RequestMapping(value = "/search", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public RestResponse<FacetedSearchResult> searchUsers(@RequestBody UserSearchRequest searchRequest) {
        FacetedSearchResult searchResult = alienUserDao.search(searchRequest.getQuery(), searchRequest.getGroup(), searchRequest.getFrom(),
                searchRequest.getSize());
        return RestResponseBuilder.<FacetedSearchResult> builder().data(searchResult).build();
    }

    /**
     * Add a role to a given user.
     *
     * @param username The unique username of the user for which to add a role.
     * @param role The role to add to the user.
     */
    @ApiOperation(value = "Add a role to a user.")
    @RequestMapping(value = "/{username}/roles/{role}", method = RequestMethod.PUT, produces = MediaType.APPLICATION_JSON_VALUE)
    @Audit
    public RestResponse<Void> addRole(@PathVariable String username, @PathVariable String role) {
        if (username == null || username.isEmpty()) {
            return RestResponseBuilder.<Void> builder()
                    .error(RestErrorBuilder.builder(RestErrorCode.ILLEGAL_PARAMETER).message("username cannot be null or empty").build()).build();
        }
        String goodRoleToAdd = Role.getStringFormatedRole(role);
        User user = userService.retrieveUser(username);

        Set<String> roleSet = user.getRoles() == null ? new HashSet<String>() : Sets.newHashSet(user.getRoles());
        roleSet.add(goodRoleToAdd);
        user.setRoles(roleSet.toArray(new String[roleSet.size()]));
        alienUserDao.save(user);

        return RestResponseBuilder.<Void> builder().build();
    }

    /**
     * Removes a role from a given user.
     *
     * @param username The unique username of the user from which to remove the role.
     * @param role The role to remove to the user.
     * @return an empty (void) rest {@link RestResponse}.
     */
    @ApiOperation(value = "Remove a role from a user.")
    @RequestMapping(value = "/{username}/roles/{role}", method = RequestMethod.DELETE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Audit
    public RestResponse<Void> removeRole(@PathVariable String username, @PathVariable String role, HttpServletResponse servletResponse) {
        if (username == null || username.isEmpty()) {
            return RestResponseBuilder.<Void> builder()
                    .error(RestErrorBuilder.builder(RestErrorCode.ILLEGAL_PARAMETER).message("username cannot be null or empty").build()).build();
        } else if (userService.isAdmin(username) && userService.countAdminUser() == 1) {
            servletResponse.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
            return RestResponseBuilder
                    .<Void> builder()
                    .error(RestErrorBuilder.builder(RestErrorCode.DELETE_LAST_ADMIN_ROLE_ERROR)
                            .message("It's forbidden to remove the admin role of the last admin user.")
                            .build()).build();
        }
        String goodRoleToAdd = Role.getStringFormatedRole(role);
        User user = userService.retrieveUser(username);
        String[] roles = user.getRoles();
        roles = ArrayUtils.removeElement(roles, goodRoleToAdd);
        user.setRoles(roles);
        alienUserDao.save(user);

        return RestResponseBuilder.<Void> builder().build();
    }

}
