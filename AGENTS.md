<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

<!-- IMPORTANT NOTE start -->

## IMPORTANT NOTE

### React Compiler

React Compiler — aka React Forget — that automatically memoizes components and hooks at compile time such that useMemo, useCallback, and memo is removed in many cases. MADRiGAN Blog

Now, go back and read that line again, would you? When another developer turned on the compiler in a dashboard app, it eliminated the need for 2,300 lines of memoization code, and the app was faster without the manual optimisations. Vocal Media

**Follow these 2 patterns strictly:**

- **1.** Actions API and use() shipped stable in React 19 — and it completely rethinks what async means in components. Say no to useEffect spaghetti for data fetching:

```JS
// React 19 — clean async with use() and Suspense | DO NOT USE USEEFFECT
import { use, Suspense } from "react";

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // unwraps promise directly
  return <h2>Welcome, {user.name}</h2>;
}

export default function Page() {
  const data = fetchUser(42); // returns a promise
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UserProfile userPromise={data} />
    </Suspense>
  );
}
```

- **2.** Use types as documentation

```JS
// Don't do this
const getUser = async (id: any) => { ... }

// Do this — types as documentation
type UserId = string & { readonly _brand: "UserId" };

const getUser = async (id: UserId): Promise<User> => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
};
```

Conclusion: Before you write your next useMemo, consider whether the compiler does this for you already.

### useActionState

useActionState replaces the old useFormState pattern with cleaner semantics and better TypeScript support. This built-in hook has greatly simplified common patterns that previously required 20+ lines of custom code into just a few lines. Vocal Media

```JS
// Before: custom state, manual pending flag, error juggling
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<string | null>(null);

// After: one hook, clean and readable
const [error, submitAction, isPending] = useActionState(
  async (prevState: string | null, formData: FormData) => {
    const result = await saveUserProfile(formData);
    if (!result.ok) return "Failed to save profile.";
    return null;
  },
  null
);
```

EVERYTHING IN THIS ARTICLE SHOULD BE APPLIED IN MY/OUR PROJECTS:
<https://medium.com/@mernstackdevbykevin/react-hooks-are-getting-a-major-upgrade-heres-what-every-developer-needs-to-know-in-2026-9f2a14158793>

LET ME KNOW IF THAT LINK CAN'T BE OPENED.

<!-- IMPORTANT NOTE end -->

## Project Guidelines

I'm a senior frontend engineer specializing in React, React Native, Storybook, UI, and design systems, and I need my code bases clean, components small and broken up, the repo linted and formatted.

The design of the application and components MUST BE rich, color correct, and beautiful.

There should never be any type errors, nor should stale or zombie code be left behind changes to cause errors. ALWAYS DO A CLEANUP.

HIGH PRIORITY:

1. Make 100% sure all of the packages in the package.json are the latest releases while aligning perfectly with all other packages. There should never be issues with versioning. Never. Always add packages to the package.json when importing libraries, and don't let that make a build or ci fail.

2. For every project documentation should be automated, generated and updated as changes are made to code, components, ideas, plans, roadmaps, etc. Please use Mintlify, Docusaurus or Featurebase for all of the docs across the repo. If not yet built, there needs to be a reusable SKILL or MCP of whichever docs solution we decide upon, which will then be used for all future projects moving forward.

3. Clarifying questions and suggestions are important

4. Update the README.md section "What's New in {version}" where "version" is newest and content are changes, updates, etc. Focus on new features and big fixes, otherwise use the lower level changes.

5. Use git bash if bash unavailable
