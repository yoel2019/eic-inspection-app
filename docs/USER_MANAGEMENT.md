
# User Management System Documentation

## Overview

The Enhanced User Management System provides comprehensive functionality for managing users in the EIC Inspection App. It includes real-time updates, advanced validation, logging, and role-based access control.

## Features

### Core Functionality
- **CRUD Operations**: Create, Read, Update, Delete users
- **Real-time Updates**: Live synchronization with Firebase
- **Advanced Validation**: Comprehensive input validation and sanitization
- **Logging System**: Complete audit trail of all user management actions
- **Role-based Access**: Granular permission system
- **Soft Delete**: Users are deactivated rather than permanently deleted
- **Search & Filter**: Advanced filtering and search capabilities
- **Pagination**: Efficient handling of large user lists

### Security Features
- **Super Admin Only**: Only super administrators can manage users
- **Permission Validation**: Role hierarchy enforcement
- **Audit Logging**: All actions are logged with user context
- **Input Sanitization**: All inputs are validated and sanitized
- **Last Super Admin Protection**: Prevents deletion of the last super admin

## Architecture

### Components

#### 1. EnhancedUserManager (`user-management-enhanced.js`)
Main class that handles all user management operations.

**Key Methods:**
- `createUser(userData)` - Create new user with validation
- `updateUser(userId, userData)` - Update existing user
- `deleteUser(userId, confirmation)` - Soft delete user
- `restoreUser(userId)` - Restore deleted user
- `getFilteredUsers()` - Get paginated and filtered users
- `getUserStats()` - Get user statistics

#### 2. Logger System (`logger.js`)
Centralized logging system for tracking all user management actions.

**Features:**
- Multiple log levels (DEBUG, INFO, WARN, ERROR)
- Console and Firestore logging
- User context tracking
- Local log storage with rotation

#### 3. Validator System (`validator.js`)
Comprehensive validation system for user inputs.

**Features:**
- Field-level validation
- Custom validation rules
- Input sanitization
- Password strength checking
- File upload validation

### Data Flow

```
User Action → Validation → Permission Check → Database Operation → Logging → UI Update
```

## Usage

### Initialization

```javascript
import { EnhancedUserManager } from './user-management-enhanced.js';

const userManager = new EnhancedUserManager();

// Set up real-time update callbacks
userManager.setUpdateCallbacks(
  (users) => updateUsersUI(users),
  (roles) => updateRolesUI(roles)
);
```

### Creating Users

```javascript
try {
  const userData = {
    email: 'user@example.com',
    password: 'securePassword123',
    displayName: 'John Doe',
    role: 'employee'
  };
  
  const newUser = await userManager.createUser(userData);
  console.log('User created:', newUser);
} catch (error) {
  console.error('Failed to create user:', error.message);
}
```

### Updating Users

```javascript
try {
  const updateData = {
    displayName: 'Jane Doe',
    role: 'manager'
  };
  
  const updatedUser = await userManager.updateUser(userId, updateData);
  console.log('User updated:', updatedUser);
} catch (error) {
  console.error('Failed to update user:', error.message);
}
```

### Filtering and Searching

```javascript
// Set search term
userManager.setSearchTerm('john');

// Set role filter
userManager.setRoleFilter('manager');

// Set status filter
userManager.setStatusFilter('active');

// Set sorting
userManager.setSorting('createdAt', 'desc');

// Get filtered results
const result = userManager.getFilteredUsers();
console.log('Filtered users:', result.users);
console.log('Total pages:', result.totalPages);
```

## Validation Rules

### User Creation
- **Email**: Required, valid email format, unique
- **Password**: Required, minimum 6 characters, contains letters and numbers
- **Display Name**: Required, 2-50 characters
- **Role**: Required, must exist in roles collection and be active

### User Update
- **Display Name**: Required, 2-50 characters
- **Role**: Required, must exist in roles collection and be active

## Permission System

### Role Hierarchy
1. **Employee** (Level 1) - Basic access
2. **Manager** (Level 2) - Management access
3. **Administrator** (Level 3) - Administrative access
4. **Super Administrator** (Level 4) - Full system access

### Access Rules
- Only Super Administrators can manage users
- Users can only be assigned roles at or below the current user's level
- Super Administrators can create other Super Administrators
- The last Super Administrator cannot be deleted

## Logging

All user management actions are logged with the following information:
- Timestamp
- User performing the action
- Action type (CREATE_USER, UPDATE_USER, DELETE_USER, etc.)
- Target user ID
- Action details
- User context (role, email)

### Log Categories
- `USER_MANAGEMENT` - General user management actions
- `SECURITY` - Security-related events
- `AUTHENTICATION` - Auth events
- `SYSTEM_ERROR` - System errors

## Real-time Updates

The system uses Firebase real-time listeners to keep the UI synchronized:
- User list updates automatically when users are added/modified
- Role changes are reflected immediately
- Multiple admin users see changes in real-time

## Error Handling

### Common Errors
- **Authentication Required**: User must be logged in
- **Insufficient Permissions**: Only super admins can manage users
- **Validation Failed**: Input data doesn't meet requirements
- **User Already Exists**: Email address is already in use
- **Invalid Role**: Selected role doesn't exist or is inactive
- **Last Super Admin**: Cannot delete the last super administrator

### Error Response Format
```javascript
{
  message: "Error description",
  code: "ERROR_CODE",
  details: { /* additional error details */ }
}
```

## Best Practices

### Security
1. Always validate user permissions before operations
2. Use input sanitization for all user data
3. Log all administrative actions
4. Implement soft delete for audit trails
5. Protect against deletion of critical users

### Performance
1. Use pagination for large user lists
2. Implement debounced search
3. Cache role information
4. Use real-time listeners efficiently

### User Experience
1. Provide clear error messages
2. Show loading states during operations
3. Confirm destructive actions
4. Display user statistics and insights

## Integration with Main App

The Enhanced User Manager integrates with the main EIC App through:

1. **Global Instance**: Available as `window.eicApp.userManager`
2. **Role Checking**: Uses `window.eicApp.currentUserRole` for permissions
3. **UI Updates**: Triggers UI re-renders through callbacks
4. **Error Handling**: Uses SweetAlert2 for user notifications

## Testing

### Unit Tests
- Validation functions
- Permission checking
- Data sanitization
- Error handling

### Integration Tests
- Firebase operations
- Real-time listeners
- UI updates
- End-to-end workflows

## Maintenance

### Regular Tasks
1. Monitor log files for errors
2. Review user activity patterns
3. Clean up old log entries
4. Update validation rules as needed
5. Review and update role permissions

### Troubleshooting
1. Check browser console for JavaScript errors
2. Verify Firebase configuration
3. Check user permissions in Firestore
4. Review log entries for error patterns
5. Test with different user roles

## Future Enhancements

### Planned Features
- Bulk user operations
- User import/export
- Advanced reporting
- Email notifications
- Two-factor authentication
- Session management
- User activity tracking

### Performance Optimizations
- Virtual scrolling for large lists
- Lazy loading of user details
- Caching strategies
- Background sync
