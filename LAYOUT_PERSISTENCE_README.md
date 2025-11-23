# Layout Persistence for GUIDER Diagrams

This feature allows you to manually arrange diagram nodes in development mode, save those positions, and have them persist in production builds.

## How It Works

1. **In Development**: Each diagram shows a "💾 Save Layout" button (top-right corner)
2. **Arrange Nodes**: Drag nodes to your desired positions
3. **Save Layout**: Click the button to download a JSON file with positions
4. **Commit**: Save the JSON file to `src/layouts/{diagramName}.json`
5. **Build**: Run `yarn build` - saved layouts are included in the static build
6. **Deploy**: Serve the static build anywhere (Synology, GitHub Pages, S3, etc.)

## Workflow

### Step 1: Arrange Nodes in Development

Start the dev server:
```bash
yarn dev
```

Open the diagram you want to customize and drag nodes to your preferred positions.

### Step 2: Save the Layout

Click the **💾 Save Layout** button in the top-right corner. This will:
- Download a JSON file (e.g., `systemOverview.json`)
- Log the layout to the browser console

### Step 3: Move the JSON File

Move the downloaded file to the correct location:

```bash
# For System Overview
mv ~/Downloads/systemOverview.json src/layouts/systemOverview.json

# For Message Flow
mv ~/Downloads/messageFlow.json src/layouts/messageFlow.json

# For Kubernetes Infrastructure
mv ~/Downloads/kubernetesInfra.json src/layouts/kubernetesInfra.json
```

### Step 4: Build for Production

```bash
yarn build
```

The build process includes the JSON files from `src/layouts/`.

### Step 5: Deploy

Deploy the `dist/` directory to your preferred hosting:

```bash
# Example: Copy to Synology
scp -r dist/* user@synology:/path/to/web/

# Example: Deploy to GitHub Pages
# (Handled by GitHub Actions or manual push to gh-pages branch)

# Example: Upload to S3
aws s3 sync dist/ s3://your-bucket-name/
```

## Diagram Names

Each diagram has a specific name for its layout file:

| Diagram | File Name | Location |
|---------|-----------|----------|
| System Overview | `systemOverview.json` | `src/layouts/systemOverview.json` |
| Message Flow | `messageFlow.json` | `src/layouts/messageFlow.json` |
| Kubernetes Infrastructure | `kubernetesInfra.json` | `src/layouts/kubernetesInfra.json` |

## Layout File Format

Each JSON file contains an array of node positions:

```json
[
  {
    "id": "forecast",
    "position": {
      "x": 450,
      "y": 120
    }
  },
  {
    "id": "heartbeat",
    "position": {
      "x": 200,
      "y": 350
    }
  }
]
```

## Behavior

### With Saved Layout
- Diagram loads with your custom node positions
- `fitView` is disabled to preserve exact positions
- You can still drag nodes in development and re-save

### Without Saved Layout
- Diagram uses dagre auto-layout (default hierarchical layout)
- `fitView` is enabled to center the diagram
- Nodes are automatically positioned

## Development vs Production

### Development Mode (`yarn dev`)
- **💾 Save Layout** button is visible
- You can arrange and save layouts
- Hot-reload preserves your changes

### Production Mode (`yarn build`)
- **💾 Save Layout** button is hidden
- Diagrams load with saved layouts
- Static files served from `dist/`

The button visibility is controlled by `import.meta.env.PROD`:
```typescript
if (import.meta.env.PROD) {
  return null; // Hide in production
}
```

## Tips

### Re-arranging Nodes
1. Delete the JSON file from `src/layouts/`
2. Restart dev server
3. Diagram reverts to dagre auto-layout
4. Drag nodes to new positions
5. Save again

### Version Control
Commit the JSON files to your repository:
```bash
git add src/layouts/*.json
git commit -m "Update diagram layouts"
```

This ensures layouts are versioned and shared across your team.

### Copying Console Output
If you prefer not to download the file, you can copy from the browser console:

1. Click **💾 Save Layout**
2. Open browser console (F12)
3. Find the logged JSON
4. Copy and paste into `src/layouts/{diagramName}.json`

Example console output:
```
Layout for systemOverview:
{
  "forecast": { "x": 450, "y": 120 },
  ...
}
Save this to: src/layouts/systemOverview.json
```

## Troubleshooting

### Button Not Showing
**Problem**: Save Layout button is not visible

**Solution**:
- Ensure you're in development mode (`yarn dev`)
- Check that the diagram component imported `SaveLayoutButton`

### Layout Not Loading
**Problem**: Saved layout doesn't apply after build

**Solution**:
- Verify JSON file is at `src/layouts/{diagramName}.json` (exact name!)
- Check JSON format is valid (use `jq` or JSON validator)
- Ensure `yarn build` completed successfully
- Clear browser cache

### Nodes Overlap
**Problem**: Nodes are positioned on top of each other

**Solution**:
- Delete the JSON file
- Let dagre auto-layout position nodes
- Manually adjust overlapping nodes
- Save again

### fitView Not Working
**Problem**: Diagram doesn't center on load

**Solution**:
- This is expected when a saved layout exists
- `fitView` is disabled to preserve exact positions
- Delete JSON file if you want auto-centering

## Example Workflow

```bash
# 1. Start development
yarn dev

# 2. Open http://localhost:5173
# 3. Navigate to System Overview diagram
# 4. Drag nodes to desired positions
# 5. Click "💾 Save Layout"

# 6. Move downloaded file
mv ~/Downloads/systemOverview.json src/layouts/

# 7. Verify it works
# Reload the page - positions should be preserved

# 8. Build for production
yarn build

# 9. Test production build locally
yarn preview

# 10. Deploy to Synology/S3/GitHub Pages
# (Your deployment method here)
```

## Architecture Notes

### Component Structure
Each diagram component follows this pattern:

1. **Load saved layout on mount**
   ```typescript
   useEffect(() => {
     loadSavedLayout().then(savedPositions => {
       if (savedPositions) {
         // Apply saved positions
       } else {
         // Use dagre auto-layout
       }
     });
   }, []);
   ```

2. **Render SaveLayoutButton** (dev only)
   ```typescript
   <SaveLayoutButton nodes={nodes} diagramName="systemOverview" />
   ```

3. **Conditional fitView**
   ```typescript
   fitView={!layoutLoaded}
   ```

### Why This Works
- Vite includes `src/` in the build output
- JSON files are served as static assets
- `fetch('/src/layouts/...')` works in both dev and production
- Button visibility controlled by `import.meta.env.PROD`

## Best Practices

1. **Save Early, Save Often**: Save layouts as you work to avoid losing changes
2. **Commit to Git**: Version control your layouts with the codebase
3. **Test Before Deploy**: Run `yarn preview` to test production build locally
4. **Document Custom Layouts**: Add comments in your commit messages explaining layout decisions
5. **Use Descriptive Positions**: Arrange nodes logically (e.g., data flow top-to-bottom)

## Future Enhancements

Possible improvements for this feature:

- [ ] Add "Reset to Default" button to clear custom layout
- [ ] Show indicator when custom layout is active
- [ ] Export all diagrams at once
- [ ] Import layout from clipboard
- [ ] Layout versioning/history
- [ ] Grid snap for aligned positioning
- [ ] Undo/redo for node movements

## License

Part of the GUIDER project.
Copyright © 2025 EXCET, Inc.
