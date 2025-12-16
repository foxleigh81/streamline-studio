#!/bin/bash

# Project to Channel Rename Script
# This script performs comprehensive renaming from "project" to "channel" across the codebase

set -e

echo "Starting project → channel rename..."

# Phase 1: Update imports from schema
echo "Phase 1: Updating schema imports..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e 's/import.*projects.*from.*@\/server\/db\/schema/&/g' \
  -e 's/\bprojects\b/channels/g' \
  -e 's/\bprojectUsers\b/channelUsers/g' \
  -e 's/\bProject\b/Channel/g' \
  -e 's/\bProjectUser\b/ChannelUser/g' \
  -e 's/\bNewProject\b/NewChannel/g' \
  -e 's/\bNewProjectUser\b/NewChannelUser/g' \
  -e 's/\bProjectRole\b/ChannelRole/g' \
  {} \;

# Phase 2: Update repository imports and usage
echo "Phase 2: Updating repository imports..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e 's/project-repository/channel-repository/g' \
  -e 's/ProjectRepository/ChannelRepository/g' \
  -e 's/createProjectRepository/createChannelRepository/g' \
  {} \;

# Phase 3: Update projectId → channelId in code
echo "Phase 3: Updating projectId → channelId..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e 's/\bprojectId\b/channelId/g' \
  -e 's/project\.id/channel.id/g' \
  -e 's/project:/channel:/g' \
  {} \;

# Phase 4: Update context variable names
echo "Phase 4: Updating context variables..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e 's/ctx\.project\b/ctx.channel/g' \
  -e 's/context\.project\b/context.channel/g' \
  {} \;

# Phase 5: Update route params
echo "Phase 5: Updating route params..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e 's/params\.project\b/params.channel/g' \
  -e 's/\[project\]/[channel]/g' \
  {} \;

# Phase 6: Clean up backup files
echo "Cleaning up backup files..."
find src -name "*.bak" -delete
find scripts -name "*.bak" -delete

echo "Rename complete!"
echo "Please run 'npm run type-check' to verify changes."
