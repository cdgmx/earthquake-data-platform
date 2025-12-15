#!/usr/bin/env node
// scripts/post-build-report.js
// Shared post-build reporting and standalone flattening for Next.js apps

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";

async function listDirectory(dirPath) {
	try {
		const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
		const sorted = entries.sort((a, b) => a.name.localeCompare(b.name));
		return sorted.map((entry) => {
			const marker = entry.isDirectory() ? "[d]" : "[f]";
			return `${marker} ${entry.name}`;
		});
	} catch (error) {
		return [`[error] ${error.message}`];
	}
}

async function listDirectoryRecursive(dirPath, maxDepth = 4, currentDepth = 0, prefix = "") {
	if (currentDepth >= maxDepth) {
		return [];
	}

	try {
		const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
		const sorted = entries.sort((a, b) => a.name.localeCompare(b.name));
		const lines = [];

		for (const entry of sorted) {
			if (entry.name === "node_modules") {
				lines.push(`${prefix}[d] ${entry.name} (skipped)`);
				continue;
			}

			const marker = entry.isDirectory() ? "[d]" : "[f]";
			lines.push(`${prefix}${marker} ${entry.name}`);

			if (entry.isDirectory()) {
				const childPath = path.join(dirPath, entry.name);
				const childLines = await listDirectoryRecursive(
					childPath,
					maxDepth,
					currentDepth + 1,
					`${prefix}  `,
				);
				lines.push(...childLines);
			}
		}

		return lines;
	} catch (error) {
		return [`${prefix}[error] ${error.message}`];
	}
}

async function report() {
	const cwd = process.cwd();
	const repoRoot = path.resolve(cwd, "..", "..");
	const nextOut = path.resolve(cwd, ".next");

	console.log("=== Post-build environment report ===");
	console.log(`node version : ${process.version}`);
	console.log(`platform     : ${process.platform}`);
	console.log(`cwd          : ${cwd}`);
	console.log(`NODE_ENV     : ${process.env.NODE_ENV ?? "(not set)"}`);

	const targets = [
		{ label: "cwd contents", dir: cwd },
		{ label: ".next contents", dir: nextOut },
		{ label: "apps directory", dir: path.dirname(cwd) },
		{ label: "repo root", dir: repoRoot },
	];

	for (const target of targets) {
		console.log(`\n--- ${target.label} (${target.dir}) ---`);
		const entries = await listDirectory(target.dir);
		for (const line of entries) {
			console.log(line);
		}
	}

	const standaloneDir = path.join(nextOut, "standalone");
	if (fs.existsSync(standaloneDir)) {
		console.log(`\n--- .next/standalone structure (4 levels, node_modules excluded) ---`);
		const standaloneEntries = await listDirectoryRecursive(standaloneDir, 4);
		for (const line of standaloneEntries) {
			console.log(line);
		}
	}

	const root = cwd;
	const standaloneRoot = path.join(root, ".next", "standalone");

	try {
		function findServerJs(dir, depth = 0, maxDepth = 5) {
			if (depth > maxDepth) {
				return null;
			}

			try {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				
				const serverFile = path.join(dir, "server.js");
				if (fs.existsSync(serverFile)) {
					const pkgFile = path.join(dir, "package.json");
					if (fs.existsSync(pkgFile)) {
						return dir;
					}
				}

				for (const entry of entries) {
					if (entry.isDirectory() && entry.name !== "node_modules") {
						const found = findServerJs(path.join(dir, entry.name), depth + 1, maxDepth);
						if (found) {
							return found;
						}
					}
				}
			} catch (err) {
				// Ignore permission errors
			}

			return null;
		}

		const nestedServerDir = findServerJs(standaloneRoot);
		
		if (!nestedServerDir) {
			console.warn("Warning: server.js not found in standalone directory tree - skipping flatten step");
			console.log("=== End of report ===");
			return;
		}

		console.log(`Found server.js at: ${nestedServerDir}`);

		if (nestedServerDir === standaloneRoot) {
			console.log("Server files already at standalone root, no flattening needed");
		} else {
			const nestedContents = fs.readdirSync(nestedServerDir);
			for (const item of nestedContents) {
				const srcPath = path.join(nestedServerDir, item);
				const destPath = path.join(standaloneRoot, item);
				
				if (fs.existsSync(destPath)) {
					fs.rmSync(destPath, { recursive: true, force: true });
				}
				
				fs.renameSync(srcPath, destPath);
			}
			console.log(`Moved server files from ${nestedServerDir} to ${standaloneRoot}`);

			const topLevelDirs = fs.readdirSync(standaloneRoot, { withFileTypes: true })
				.filter(entry => entry.isDirectory() && !["node_modules", ".next", "public"].includes(entry.name));
			
			for (const dir of topLevelDirs) {
				const dirPath = path.join(standaloneRoot, dir.name);
				if (!fs.existsSync(path.join(dirPath, "server.js"))) {
					try {
						fs.rmSync(dirPath, { recursive: true, force: true });
						console.log(`Cleaned up mirrored directory: ${dir.name}`);
					} catch (err) {
						console.warn(`Could not remove ${dir.name}:`, err.message);
					}
				}
			}
		}

		const copyIfExists = (source, destination, label) => {
			if (!fs.existsSync(source)) {
				console.log(`Skipping ${label}, source missing at ${source}`);
				return;
			}
			fs.mkdirSync(path.dirname(destination), { recursive: true });
			console.log(`Copying ${label} -> ${destination}`);
			fs.cpSync(source, destination, { recursive: true });
		};

		const tracedStaticSrc = path.join(root, ".next", "static");
		const tracedStaticDest = path.join(standaloneRoot, ".next", "static");
		copyIfExists(tracedStaticSrc, tracedStaticDest, ".next/static assets");

		const publicSrc = path.join(root, "public");
		const publicDest = path.join(standaloneRoot, "public");
		copyIfExists(publicSrc, publicDest, "public assets");

		console.log("\n--- Installing runtime dependencies in standalone root ---");

		const standalonePackageJson = path.join(standaloneRoot, "package.json");
		if (!fs.existsSync(standalonePackageJson)) {
			throw new Error("package.json not found in standalone root");
		}

		const pkgBuffer = fs.readFileSync(standalonePackageJson, "utf-8");
		const pkgJson = JSON.parse(pkgBuffer);
		const dependencyEntries = Object.entries(pkgJson.dependencies ?? {});
		const isWorkspaceSpec = (name, version) => {
			if (!version) {
				return false;
			}
			if (version === "*" || version.startsWith("workspace:")) {
				return true;
			}
			return name.startsWith("@inkyway/");
		};
		const retainedDeps = dependencyEntries.filter(([name, version]) => !isWorkspaceSpec(name, version));
		const removedDeps = dependencyEntries.filter(([name, version]) => isWorkspaceSpec(name, version));
		if (removedDeps.length > 0) {
			console.log("Removing workspace-only dependencies from standalone package.json:");
			for (const [name, version] of removedDeps) {
				console.log(`  - ${name} (${version})`);
			}
			pkgJson.dependencies = Object.fromEntries(retainedDeps);
			fs.writeFileSync(standalonePackageJson, `${JSON.stringify(pkgJson, null, 2)}\n`, "utf-8");
		}

		const standaloneNodeModules = path.join(standaloneRoot, "node_modules");
		if (fs.existsSync(standaloneNodeModules)) {
			console.log("Removing existing standalone node_modules to avoid symlinks...");
			fs.rmSync(standaloneNodeModules, { recursive: true, force: true });
		}

		const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
		try {
			execSync(`${npmCmd} install --omit=dev --no-audit --no-fund`, {
				cwd: standaloneRoot,
				stdio: "inherit",
			});
		} catch (installErr) {
			throw new Error(`npm install failed in standalone root: ${installErr.message}`);
		}

		console.log(`\n✅ Flattened standalone structure at ${standaloneRoot}`);
		console.log("✅ Runtime dependencies installed via npm (no symlinks)");
		console.log("Point Appwrite 'Output directory' to: .next/standalone");
	} catch (err) {
		console.error("❌ Flatten deployment step failed:", err.message);
		process.exit(1);
	}

	console.log("=== End of report ===");
}

report().catch((error) => {
	console.error("post-build report failed", error);
	process.exit(1);
});
