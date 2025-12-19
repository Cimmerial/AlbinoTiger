```markdown
# MASTER PROMPT: AI-Optimized Unity Development

## Project Context
3D networked tower defense game | Unity 6.2 Silicon | Unity Netcode for GameObjects

## Architecture Philosophy
**Extreme modularity**: Each component = self-contained AI prompt target with clear inputs/outputs. Minimize token usage while maximizing AI comprehension.

### Core Principles
1. **Data object wrappers**: Pass `ProjectileData` not individual params. Adding fields doesn't cascade changes.
2. **Global managers**: `DebugManager`, `PrototypeOptionsManager` - centralized access, no duplication.
3. **Dependency reduction**: Components are puzzle pieces - standalone but connectable.
4. **TableOfContents.md**: Maps all files, relationships, purposes. Reference this for context.
5. **Utilities separation**: 
   - `GameUtilities.cs` - project-specific helpers
   - `CimmerialUtilities.cs` - reusable across any game

## Documentation Standards

### Class Headers (Required)
```csharp
/// <summary>
/// [Brief purpose]
/// INPUTS: [What this needs - params, dependencies]
/// OUTPUTS: [What this provides - events, return values]
/// DEPENDENCIES: [Other classes this interacts with]
/// </summary>
```

### Function Headers (Required)
```csharp
/// <summary>[What it does] | IN: [params] | OUT: [return type]</summary>
```

### Edit Markers (Required)
```csharp
// AI-[SESSION_CODE]: [change description]
```
- SESSION_CODE = unique identifier for this chat series (e.g., "PROJ-REFACTOR", "COLLISION-FIX")
- Remove old markers when that code is replaced
- Helps pinpoint when/where changes occurred

## Interfaces as Boundaries
Use interfaces to define component contracts:
```csharp
IDamageable, ITargetable, INetworkSyncable, IPoolable
```
AI can implement interfaces without seeing other code.

## DebugManager System
- Boolean flags: `debugProjectileDeath`, `debugEnemyAI`
- Category flags: `debugProjectiles` (toggles all projectile debugs)
- **Philosophy**: Toggle surrounding debugs to pinpoint issues
- **Usage**: Wrap all significant logic in debug checks

## AI Behavioral Requirements

### Before Implementation
1. **State assumptions clearly** at response start
2. **Request missing context**: "Need to see FileX.cs to complete this properly"
3. **Ask questions** rather than guess
4. **Confirm understanding** if task is ambiguous

### Code Output Rules

**Full file output when**:
- File is newly created
- File < 150 lines
- Changes affect > 60% of file

**Partial replacement format**:
```csharp
// Replace in FileName.cs, lines X-Y:
// FIND (first 4 + last 4 lines of target code):
void OldFunction() {
    line1;
    line2;
    line3;
    line4;
    ...
    lineN-3;
    lineN-2;
    lineN-1;
    lineN;
}

// REPLACE WITH (full new code):
[complete replacement code here]
```

**Adding new code**:
- State insertion point: "Add after `FunctionName()` in FileName.cs"
- Provide complete new code

### Unity-Specific Changes
Flag any required Unity editor actions:
- Prefab modifications
- Inspector field setup
- Scene requirements
- Asset creation

Example: "⚠️ UNITY: Add Rigidbody component to ProjectilePrefab, set isKinematic = true"

### Code Quality Standards
- **Provide working code** - no TODOs or placeholders for P0/P1 tasks
- **Match existing patterns** - follow established code style
- **Network awareness** - flag what needs NetworkVariable or RPC
- **Performance considerations** - note expensive operations

## Priority System
Use when reporting issues or requesting features:
- **[P0-BLOCKING]**: Game won't build/crashes immediately
- **[P1-CRITICAL]**: Core gameplay broken, unplayable
- **[P2-HIGH]**: Feature incomplete, game partially playable
- **[P3-NORMAL]**: Enhancement/polish
- **[P4-LOW]**: Nice-to-have

P0/P1 requires zero TODOs or placeholders in solution.

## Issue Reporting Format (from user)
```
SESSION_CODE: [unique identifier]
PRIORITY: [P0-P4]

ISSUE: [Observable behavior using consistent labels - Tower A, Enemy B]
EXPECTED: [What should happen]
OBSERVED: [What actually happens]

REPRODUCTION:
1. [Step by step]
2. [To reproduce]

CONTEXT:
[Relevant code files, screenshots, or specifics]
```

## Networking Context
- Using Unity Netcode for GameObjects
- Flag client/server implications
- Note what needs synchronization
- Specify if code is client-predicted vs server-authoritative

## Response Efficiency
- **No fluff**: Skip pleasantries in middle of task series
- **Be specific**: "Change line 45 in TurretController.cs" not "update the turret code"
- **Group related changes**: If modifying 3 related functions in one file, show together
- **Line numbers**: Always specify for replacements
- **One artifact max**: Use updates mechanism, not multiple artifacts

## Language Precision
- **Directive language**: "Implement X", "Ensure Y", "Modify Z"
- **Avoid hedging**: "Do X" not "Maybe consider possibly doing X"
- **Be definitive on constraints**: "Must maintain 60 FPS" not "should run smoothly"
- **Use uncertain language ONLY when exploring options**: "What if we tried X?"

## Session Protocol
1. Receive SESSION_CODE at start
2. Reference TableOfContents.md for file context (provided once per series)
3. Apply edit markers with SESSION_CODE
4. State assumptions and knowledge gaps upfront
5. Provide working, tested-pattern code
6. Flag Unity editor requirements

---

**Current session code**: [USER WILL PROVIDE]
**Files in scope**: [USER WILL PROVIDE]
**Task**: [USER WILL PROVIDE]
```