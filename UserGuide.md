# User Guide

## Overview
This project introduces two experimental additional features to NodeBB:

1. **Anonymous Posting** – allows users to post without revealing their identity
2. **User Role Identification Tags** – lets administrators assign “Teacher” or “Student” tags to users

Both features appear in the interface but contain partial or inconsistent functionality

---
## <a id="feature-1"></a>Feature 1: Anonymous Posting

### Description
The `feature/anonymize2` branch adds an **Anonymous** checkbox to the post composer toolbar
Selecting it before posting is intended to hide the user’s name and profile image once submitted.

### How to Use
1. Open any discussion topic and write a new post
2. Check the **Anonymous** box before submitting
3. Submit the post

### Intended Behavior
- Username replaced with **“Anonymous”**  
- Profile image replaced with a gray circle labeled **“A”**  
- Admins and the original author can still view the true identity
- Anonymity cannot be toggled after posting

### Current Functionality
- The checkbox appears in the composer toolbar
- Some posts still show the original username or image
- Selecting the anonymous box before posting doesn't make the post anonymous (at least for the UI)

### Known Issues
- ID card/ Profile image sometimes fails to anonymize
- Backend does not consistently mask identity data
- Behavior varies

---
## <a id="feature-2"></a>Feature 2: User Role Identification Tags (Teacher / Student)

### Description
The `feature/main-identification-tags` branch adds a **User Role Tags** section to the *Admin Control Panel (ACP)*.
(The ACP is NodeBB’s built-in admin dashboard). This interface includes a toggle switch, a text box for new roles, and dropdowns to delete or assign roles.

### How to Use
#### Creating Roles
1. Log in to NodeBB as an admin
2. Open the ACP through **Administration Panel → Manage → User Roles**
3. Toggle the switch to enable **User Role Tags**
4. Enter a name for a new role in the **New Role Name** text box
5. Click the green **Create Role** button to create the role
#### Assigning Roles
1. (You must still be an admin) After roles have been created and enabled, stay on the **User Role** page
2. Enter a username for the user being assigned a role in the **Search User** text box
3. Select a role name for that user in the **Select Role** dropdown
4. Click the blue **Assign Role** button to assign a role to a user (repeat steps  as needed) 

Now, as roles are enabled, created, and assigned, every post by a user should have their respective tag (if any at all) alongside their posts




### Intended Behavior
- Admins enable or disable the system with a toggle.  
- Roles such as “Teacher” and “Student” can be created, deleted, and assigned.  
- Tags display beside usernames in forum posts when enabled
- Allow color options for teacher and student tags

### Current Functionality
- The User Role Tags section appears correctly
- The toggle switch works and shows a confirmation message (“Success: user-role-tags-saved”)
- Interface elements respond as expected
- Creating roles triggers a backend error: ("Cannot read properties of null (reading 'select-options')")
- Because of this error, roles can't be created, assigned, or deleted
- Because of this error, tags do not display.

### Known Issues
- Backend error prevents role creation
- Role data not persisted to the database
- Tag badges never render in the forum
- Branch fails existing lint and test checks
- No color functionality, since its dependency (fully functional tags) didn't operate accordingly

---

## Automated Tests

**Location:** `test/socket.io.js`

**Coverage**
- *User Role Tags:* toggles configuration, checks enforcement when disabled, and tests error handling.  

Some tests fail or remain incomplete due to backend errors.

---

## Summary

| Feature | Status | Key Findings | Next Steps |
|----------|---------|--------------|------------|
| Anonymous Posting | Partial | Checkbox present, anonymity inconsistent | Fix username/image masking logic |
| User Role Tags | Partial | ACP UI works, backend errors block tagging | Resolve “select-options” error and re-test |

---

**Team Name:** Snow Falcons
**Members:** Jacob Baer, Andrew Xue, Mason Brownrigg, Sunny Guo
**Course:** 17-313 – Foundations of Software Engineering (Fall 2025)






