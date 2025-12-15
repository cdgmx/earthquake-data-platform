#!/usr/bin/env node

/**
 * Converts the monorepo from pnpm to npm workspaces.
 *
 * Changes made:
 * 1. Updates root package.json (removes pnpm config, adds workspaces, sets type: module)
 * 2. Converts workspace:* references to * in all package.json files
 * 3. Deletes pnpm-workspace.yaml and pnpm-lock.yaml
 * 4. Cleans build artifacts (.next directories, .turbo cache)
 *
 * Run: node scripts/convert-to-npm.js
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function log(message) {
	console.log(`[convert-to-npm] ${message}`);
}

function readJson(filePath) {
	return JSON.parse(readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
	writeFileSync(filePath, JSON.stringify(data, null, "\t") + "\n");
}

function convertWorkspaceRefs(obj) {
	if (typeof obj !== "object" || obj === null) {
		return obj;
	}

	for (const key of Object.keys(obj)) {
		if (typeof obj[key] === "string" && obj[key] === "workspace:*") {
			obj[key] = "*";
		} else if (typeof obj[key] === "object") {
			convertWorkspaceRefs(obj[key]);
		}
	}

	return obj;
}

function updateRootPackageJson() {
	const pkgPath = join(ROOT, "package.json");
	const pkg = readJson(pkgPath);

	// Add workspaces field
	pkg.workspaces = ["apps/*", "packages/*"];

	// Add type: module for ES modules
	pkg.type = "module";

	// Update scripts: pnpm --filter to npm --workspace
	if (pkg.scripts) {
		for (const [name, script] of Object.entries(pkg.scripts)) {
			if (typeof script === "string" && script.includes("pnpm --filter")) {
				pkg.scripts[name] = script
					.replace(/pnpm --filter (\S+) run (\S+)/g, "npm run $2 --workspace=$1")
					.replace(/pnpm --filter (\S+) (\S+)/g, "npm run $2 --workspace=$1");
			}
		}
	}

	// Update packageManager to npm (Turbo requires this field)
	pkg.packageManager = "npm@10.8.2";

	// Move pnpm.overrides to root overrides
	if (pkg.pnpm?.overrides) {
		pkg.overrides = { ...pkg.overrides, ...pkg.pnpm.overrides };
		delete pkg.pnpm;
	}

	// Remove build:npm script if it exists (we're converting now)
	if (pkg.scripts?.["build:npm"]) {
		// Keep original build script
		pkg.scripts.build = "dotenv -- turbo run build";
		delete pkg.scripts["build:npm"];
	}

	writeJson(pkgPath, pkg);
	log("Updated root package.json");
}

function updateWorkspacePackageJson(pkgPath) {
	const pkg = readJson(pkgPath);
	let changed = false;

	// Convert workspace:* references in dependencies
	if (pkg.dependencies) {
		for (const [dep, version] of Object.entries(pkg.dependencies)) {
			if (version === "workspace:*") {
				pkg.dependencies[dep] = "*";
				changed = true;
			}
		}
	}

	// Convert workspace:* references in devDependencies
	if (pkg.devDependencies) {
		for (const [dep, version] of Object.entries(pkg.devDependencies)) {
			if (version === "workspace:*") {
				pkg.devDependencies[dep] = "*";
				changed = true;
			}
		}
	}

	// Convert workspace:* references in peerDependencies
	if (pkg.peerDependencies) {
		for (const [dep, version] of Object.entries(pkg.peerDependencies)) {
			if (version === "workspace:*") {
				pkg.peerDependencies[dep] = "*";
				changed = true;
			}
		}
	}

	if (changed) {
		writeJson(pkgPath, pkg);
		log(`Updated ${pkgPath.replace(ROOT, "")}`);
	}

	return changed;
}

function findPackageJsonFiles(dir) {
	const files = [];
	const entries = readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name === "node_modules" || entry.name === ".git") {
			continue;
		}

		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...findPackageJsonFiles(fullPath));
		} else if (entry.name === "package.json" && fullPath !== join(ROOT, "package.json")) {
			files.push(fullPath);
		}
	}

	return files;
}

function deletePnpmFiles() {
	const pnpmWorkspace = join(ROOT, "pnpm-workspace.yaml");
	const pnpmLock = join(ROOT, "pnpm-lock.yaml");

	if (existsSync(pnpmWorkspace)) {
		unlinkSync(pnpmWorkspace);
		log("Deleted pnpm-workspace.yaml");
	}

	if (existsSync(pnpmLock)) {
		unlinkSync(pnpmLock);
		log("Deleted pnpm-lock.yaml");
	}
}

function cleanBuildArtifacts() {
	const appsDir = join(ROOT, "apps");
	if (!existsSync(appsDir)) {
		return;
	}

	const entries = readdirSync(appsDir, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const nextDir = join(appsDir, entry.name, ".next");
		if (existsSync(nextDir)) {
			rmSync(nextDir, { recursive: true, force: true });
			log(`Deleted ${entry.name}/.next`);
		}
	}

	// Clean .turbo cache
	const turboDir = join(ROOT, ".turbo");
	if (existsSync(turboDir)) {
		rmSync(turboDir, { recursive: true, force: true });
		log("Deleted .turbo cache");
	}
}

function main() {
	log("Starting pnpm to npm conversion...\n");

	// 1. Update root package.json
	updateRootPackageJson();

	// 2. Find and update all workspace package.json files
	const packageJsonFiles = findPackageJsonFiles(ROOT);
	let updatedCount = 0;

	for (const pkgPath of packageJsonFiles) {
		if (updateWorkspacePackageJson(pkgPath)) {
			updatedCount++;
		}
	}

	log(`\nUpdated ${updatedCount} workspace package.json files`);

	// 3. Delete pnpm-specific files
	deletePnpmFiles();

	// 4. Clean build artifacts (.next, .turbo)
	cleanBuildArtifacts();

	log("\n✅ Conversion complete!");
	log("\nNext steps:");
	log("  1. Run: rm -rf node_modules");
	log("  2. Run: npm install");
	log("  3. Verify: npm run build");
}

main();
