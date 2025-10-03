#!/bin/bash

echo "=== Database Migration Cleanup ==="
echo ""

# Files to keep (already moved to keep_these/)
echo "✅ Keeping these important files:"
echo "   - README.md (documentation)"
echo "   - migration_script.sql (main migration)"
echo "   - complete_schema.sql (complete setup)"
echo "   - schema.sql (schema reference)"
echo ""

# Count files before cleanup
TOTAL_FILES=$(find . -maxdepth 1 -name "*.sql" | wc -l)
echo "📊 Total SQL files before cleanup: $TOTAL_FILES"
echo ""

# Files to delete (outdated/debugging/backup files)
echo "🗑️  Deleting outdated files:"

# Debug and check files
rm -f add_display_name_column.sql
rm -f add_first_action_column.sql
rm -f add_first_action_tracking.sql
rm -f add_id_column_back.sql
rm -f add_id_column_with_foreign_keys.sql
rm -f add_missing_columns_to_recreated_table.sql
rm -f add_missing_columns.sql
rm -f add_missing_id_column.sql
rm -f add_missing_webhook_columns.sql
rm -f add_user_deletions_table.sql
rm -f add_user_id_column.sql

echo "   - Removed debug/check files"

# Check and diagnostic files
rm -f check_actual_table_structure.sql
rm -f check_broken_relationships.sql
rm -f check_current_state.sql
rm -f check_existing_triggers.sql
rm -f check_profiles_table_exact.sql
rm -f check_recent_messages.sql
rm -f check_recent_user_updates.sql
rm -f check_schema_cache.sql
rm -f check_support_messages_rls.sql
rm -f check_trigger_complete.sql
rm -f check_trigger_simple.sql
rm -f check_trigger_status.sql
rm -f check_user_sync_data_structure.sql
rm -f check_webhook_endpoints.sql

echo "   - Removed diagnostic files"

# Cleanup and restore files
rm -f clean_restore_schema.sql
rm -f clean_slate_restore.sql
rm -f cleanup_duplicate_sync_data.sql

echo "   - Removed cleanup files"

# Fix files (outdated)
rm -f correct_profiles_schema.sql
rm -f create_missing_trigger.sql
rm -f create_profiles_table.sql
rm -f debug_slack_webhook_flow.sql
rm -f debug_trigger_issues.sql
rm -f diagnose_current_state.sql
rm -f diagnose_profiles_table.sql
rm -f diagnose_support_messages.sql
rm -f emergency_fix.sql
rm -f emergency_restore.sql
rm -f examine_existing_triggers.sql
rm -f final_fix.sql
rm -f fix_broken_tables.sql
rm -f fix_comments_foreign_key.sql
rm -f fix_create_guest_edge_function.sql
rm -f fix_duplicate_triggers_correct.sql
rm -f fix_duplicate_triggers.sql
rm -f fix_edge_function_errors.sql
rm -f fix_edge_function_permissions.sql
rm -f fix_existing_guest_users.sql
rm -f fix_existing_policies.sql
rm -f fix_foreign_keys_for_user_id_primary.sql
rm -f fix_handle_new_user_function.sql
rm -f fix_handle_new_user_robust.sql
rm -f fix_id_column_nullable.sql
rm -f fix_id_constraint.sql
rm -f fix_message_column_name.sql
rm -f fix_missing_user_id.sql
rm -f fix_orphaned_posts.sql
rm -f fix_posts_foreign_key_only.sql
rm -f fix_posts_foreign_key_reference.sql
rm -f fix_posts_profiles_cache.sql
rm -f fix_posts_profiles_relationship.sql
rm -f fix_profiles_final.sql
rm -f fix_profiles_for_edge_function.sql
rm -f fix_profiles_only.sql
rm -f fix_profiles_primary_key.sql
rm -f fix_profiles_schema.sql
rm -f fix_profiles_table_structure.sql
rm -f fix_rls_policies.sql
rm -f fix_specific_foreign_keys.sql
rm -f fix_support_messages_rls.sql
rm -f fix_support_messages_table.sql
rm -f fix_trigger_for_guest_detection.sql
rm -f fix_trigger_for_guests.sql
rm -f fix_trigger_function.sql
rm -f fix_trigger_robust.sql
rm -f fix_user_id_nulls.sql
rm -f fix_user_sync_data_table.sql

echo "   - Removed fix files"

# Keep/restore files (outdated)
rm -f keep_both_columns.sql
rm -f quick_fix_profiles.sql
rm -f recreate_profiles_table.sql
rm -f refresh_schema_cache.sql
rm -f remove_conflicting_trigger.sql
rm -f rename_message_to_message_text.sql
rm -f restore_all_foreign_keys.sql
rm -f restore_original_profiles.sql
rm -f restore_original_webhook_policy.sql
rm -f restore_original_working_setup.sql
rm -f restore_original_working_state.sql
rm -f restore_original_working.sql
rm -f restore_user_id_architecture.sql
rm -f restore_working_trigger_cascade.sql
rm -f restore_working_trigger_fixed.sql
rm -f restore_working_trigger.sql
rm -f revert_to_user_id_primary.sql
rm -f safe_fix_posts_only.sql
rm -f simple_migration.sql

echo "   - Removed restore/keep files"

# Test files
rm -f test_direct_insert.sql
rm -f test_insert_with_message_text.sql
rm -f test_support_messages_insert.sql
rm -f test_webhook_insert.sql
rm -f verify_column_names.sql

echo "   - Removed test files"

# Count files after cleanup
REMAINING_FILES=$(find . -maxdepth 1 -name "*.sql" | wc -l)
DELETED_FILES=$((TOTAL_FILES - REMAINING_FILES))

echo ""
echo "📊 Cleanup Results:"
echo "   - Files deleted: $DELETED_FILES"
echo "   - Files remaining: $REMAINING_FILES"
echo ""

echo "✅ Cleanup complete!"
echo ""
echo "📁 Remaining files:"
ls -la *.sql 2>/dev/null || echo "   (No SQL files remaining)"
echo ""
echo "📁 Important files saved in keep_these/:"
ls -la keep_these/
echo ""
echo "🎯 Next steps:"
echo "   1. Download your current database schema from Supabase"
echo "   2. Keep the files in keep_these/ as reference"
echo "   3. You can delete the keep_these/ folder once you have your schema backup"
