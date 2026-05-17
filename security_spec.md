# Firestore Security Specification - Gaveta Digital

## Data Invariants
1. A Notebook must belong to a valid authenticated user (userId).
2. Users can only read, write, or delete their own Notebooks.
3. User profiles are restricted: users can only manage their own profile.
4. Timestamps (createdAt, lastAnalyzed) must be server-generated.

## The "Dirty Dozen" (Attack Payloads)
1. **Identity Spoofing**: Attempt to create a Notebook with `userId` of another user.
2. **Ghost Field Injection**: Add `isAdmin: true` to a Notebook or User profile.
3. **Orphaned Notebook**: Create a Notebook without a valid user profile existing.
4. **ID Poisoning**: Use a 2MB string as the Notebook document ID.
5. **State Shortcut**: Attempt to update `lastAnalyzed` to a future date manually.
6. **PII Leak**: Authenticated User A tries to `get` the email of User B.
7. **Blanket Read**: Authenticated user tries to `list` all notebooks without filtering by `userId`.
8. **Immutable Field Tweak**: Attempt to change the `userId` of an existing Notebook.
9. **Denial of Wallet**: Send an array of 10,000 tags in a Notebook update.
10. **Type Poisoning**: Send `driveUrl` as a Boolean instead of a String.
11. **Spoofed Admin**: User with email `admin@example.com` tries to write to `/admins` collection.
12. **Cross-Tenant Write**: User A tries to delete a Notebook belonging to User B.

## Test Runner Logic
The `firestore.rules` must reject all 12 payloads.
