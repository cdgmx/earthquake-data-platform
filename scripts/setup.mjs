#!/usr/bin/env node

/**
 * Interactive setup script for Earthquake Data Platform
 * Checks prerequisites, installs missing tools, and guides new developers through setup
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { platform, homedir } from "node:os";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import ora from "ora";
import chalk from "chalk";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: true,
});

// Handle process interruption gracefully
process.on("SIGINT", () => {
	console.log();
	logWarning("Setup interrupted by user");
	console.log();
	const readline = getReadline();
	if (readline && !readline.closed) {
		readline.close();
	}
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log();
	logWarning("Setup terminated");
	console.log();
	const readline = getReadline();
	if (readline && !readline.closed) {
		readline.close();
	}
	process.exit(0);
});

const SYMBOLS = {
	success: "✓",
	error: "✗",
	warning: "⚠",
	info: "ℹ",
	arrow: "→",
	install: "📦",
};

// Version requirements
const REQUIREMENTS = {
	node: { min: "20.0.0", recommended: "20.11.0" },
	pnpm: { min: "10.18.2", exact: "10.18.2" },
	python: { min: "3.8.0", recommended: "3.11.0" },
	docker: { min: "20.0.0" },
};

function logSection(title) {
	console.log();
	console.log(chalk.cyan("=".repeat(60)));
	console.log(chalk.cyan.bold(` ${title}`));
	console.log(chalk.cyan("=".repeat(60)));
	console.log();
}

function logInfo(message) {
	console.log(chalk.blue(`${SYMBOLS.info} ${message}`));
}

function logSuccess(message) {
	console.log(chalk.green(`${SYMBOLS.success} ${message}`));
}

function logError(message) {
	console.log(chalk.red(`${SYMBOLS.error} ${message}`));
}

function logWarning(message) {
	console.log(chalk.yellow(`${SYMBOLS.warning} ${message}`));
}

function executeCommand(command, silent = true) {
	try {
		const result = execSync(command, {
			encoding: "utf-8",
			stdio: silent ? "pipe" : "inherit",
			env: process.env,
		});
		return { success: true, output: result.trim() };
	} catch (error) {
		return { success: false, output: error.message, error };
	}
}

function checkCommandExists(command) {
	const result = executeCommand(`command -v ${command}`);
	return result.success;
}

function getVersion(command) {
	const result = executeCommand(command);
	return result.success ? result.output : null;
}

function parseVersion(versionString) {
	const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);
	if (!match) return null;
	return {
		major: Number.parseInt(match[1], 10),
		minor: Number.parseInt(match[2], 10),
		patch: Number.parseInt(match[3], 10),
		string: `${match[1]}.${match[2]}.${match[3]}`,
	};
}

function compareVersions(current, required) {
	const currentParsed = parseVersion(current);
	const requiredParsed = parseVersion(required);

	if (!currentParsed || !requiredParsed) return -1;

	if (currentParsed.major !== requiredParsed.major) {
		return currentParsed.major - requiredParsed.major;
	}
	if (currentParsed.minor !== requiredParsed.minor) {
		return currentParsed.minor - requiredParsed.minor;
	}
	return currentParsed.patch - requiredParsed.patch;
}

async function askYesNo(question, defaultYes = true) {
	const defaultAnswer = defaultYes ? "Y/n" : "y/N";
	try {
		// Pause stdin to clear any buffered input, then resume
		process.stdin.pause();
		await new Promise(resolve => setTimeout(resolve, 50));
		process.stdin.resume();
		
		const readline = getReadline();
		const answer = await readline.question(`${question} ${chalk.dim(`[${defaultAnswer}]`)}: `);
		if (!answer || answer.trim() === "") return defaultYes;
		return answer.toLowerCase().startsWith("y");
	} catch (error) {
		console.log();
		logWarning("Input interrupted, using default");
		return defaultYes;
	}
}

async function askInput(question, defaultValue = "") {
	const prompt = defaultValue
		? `${question} ${chalk.dim(`[${defaultValue}]`)}: `
		: `${question}: `;
	try {
		// Pause stdin to clear any buffered input, then resume
		process.stdin.pause();
		await new Promise(resolve => setTimeout(resolve, 50));
		process.stdin.resume();
		
		const readline = getReadline();
		const answer = await readline.question(prompt);
		return answer || defaultValue;
	} catch (error) {
		console.log();
		logWarning("Input interrupted, using default");
		return defaultValue;
	}
}

function detectShell() {
	const shell = process.env.SHELL || "";
	if (shell.includes("zsh")) return { type: "zsh", rcFile: join(homedir(), ".zshrc") };
	if (shell.includes("bash")) return { type: "bash", rcFile: join(homedir(), ".bashrc") };
	if (shell.includes("fish")) return { type: "fish", rcFile: join(homedir(), ".config/fish/config.fish") };
	return { type: "unknown", rcFile: null };
}

async function addToPath(pathToAdd, toolName) {
	const shell = detectShell();
	
	if (!shell.rcFile) {
		console.log();
		logWarning(`Cannot auto-configure PATH for ${shell.type} shell`);
		console.log(chalk.yellow(`\nManually add to your PATH:`));
		console.log(chalk.dim(`  export PATH="${pathToAdd}:$PATH"`));
		console.log();
		return false;
	}

	console.log();
	logInfo(`${toolName} needs to be added to your PATH`);
	console.log(chalk.dim(`  Will add to: ${shell.rcFile}`));
	console.log(chalk.dim(`  Path: ${pathToAdd}`));
	
	const shouldAdd = await askYesNo(`Add ${toolName} to PATH automatically?`, true);
	
	if (!shouldAdd) {
		console.log(chalk.yellow(`\nManually add this line to ${shell.rcFile}:`));
		console.log(chalk.dim(`  export PATH="${pathToAdd}:$PATH"`));
		console.log();
		return false;
	}

	try {
		const exportLine = `\n# Added by Earthquake setup script for ${toolName}\nexport PATH="${pathToAdd}:$PATH"\n`;
		
		let rcContent = "";
		if (existsSync(shell.rcFile)) {
			rcContent = readFileSync(shell.rcFile, "utf-8");
			if (rcContent.includes(pathToAdd)) {
				logInfo(`${toolName} already in PATH configuration`);
				return true;
			}
		}
		
		writeFileSync(shell.rcFile, rcContent + exportLine);
		logSuccess(`Added ${toolName} to ${shell.rcFile}`);
		console.log(chalk.yellow(`\nRun this command to apply changes:`));
		console.log(chalk.dim(`  source ${shell.rcFile}`));
		console.log();
		
		return true;
	} catch (error) {
		logError(`Failed to update ${shell.rcFile}: ${error.message}`);
		return false;
	}
}

async function installHomebrew() {
	console.log();
	console.log(chalk.bold.cyan(`${SYMBOLS.install} Installing Homebrew`));
	logInfo("Homebrew is the package manager for macOS");
	console.log();

	const confirm = await askYesNo("Install Homebrew now?", true);
	if (!confirm) {
		logWarning("Skipped Homebrew installation");
		return false;
	}

	const spinner = ora("Downloading and installing Homebrew (this may take several minutes)").start();
	
	const result = spawnSync(
		"/bin/bash",
		["-c", '$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)'],
		{
			stdio: "inherit",
			shell: true,
		}
	);

	if (result.status === 0) {
		spinner.succeed(chalk.green("Homebrew installed successfully"));
		
		// Check if brew is in PATH
		if (!checkCommandExists("brew")) {
			const brewPath = platform() === "darwin" && process.arch === "arm64"
				? "/opt/homebrew/bin"
				: "/usr/local/bin";
			
			await addToPath(brewPath, "Homebrew");
		}
		
		return true;
	}
	
	spinner.fail(chalk.red("Failed to install Homebrew"));
	return false;
}

async function installNode() {
	console.log();
	console.log(chalk.bold.cyan(`${SYMBOLS.install} Installing Node.js ${REQUIREMENTS.node.recommended}`));
	logInfo("Node.js is required for running the TypeScript/JavaScript code");
	console.log();

	if (!checkCommandExists("brew")) {
		logError("Homebrew is required to install Node.js");
		logInfo("Please install Homebrew first or manually install Node.js from: https://nodejs.org");
		return false;
	}

	const confirm = await askYesNo("Install Node.js via Homebrew?", true);
	if (!confirm) {
		logWarning("Skipped Node.js installation");
		console.log(chalk.yellow("\nManual installation:"));
		console.log(chalk.dim("  brew install node@20"));
		console.log(chalk.dim("  Or download from: https://nodejs.org"));
		return false;
	}

	const spinner = ora("Installing Node.js 20 (this may take a few minutes)").start();
	
	const result = spawnSync("brew", ["install", "node@20"], {
		stdio: "pipe",
		shell: true,
		encoding: "utf-8",
	});

	if (result.status === 0) {
		spinner.succeed(chalk.green("Node.js installed successfully"));
		
		// Link node@20 if needed
		const linkResult = spawnSync("brew", ["link", "node@20", "--force", "--overwrite"], {
			stdio: "pipe",
			shell: true,
		});
		
		if (linkResult.status === 0) {
			logSuccess("Node.js linked to system PATH");
		}
		
		// Verify installation
		await new Promise(resolve => setTimeout(resolve, 1000));
		const version = getVersion("node --version");
		if (version) {
			logSuccess(`Verified: ${version}`);
			return true;
		}
		
		logWarning("Node.js installed but not yet in PATH. Restart terminal or source your shell config.");
		return true;
	}
	
	spinner.fail(chalk.red("Failed to install Node.js"));
	if (result.stderr) {
		console.log(chalk.red(result.stderr));
	}
	return false;
}

async function installPnpm() {
	console.log();
	console.log(chalk.bold.cyan(`${SYMBOLS.install} Installing pnpm ${REQUIREMENTS.pnpm.exact}`));
	logInfo("pnpm is the package manager for this monorepo");
	console.log();

	const confirm = await askYesNo("Install pnpm via npm?", true);
	if (!confirm) {
		logWarning("Skipped pnpm installation");
		console.log(chalk.yellow("\nManual installation:"));
		console.log(chalk.dim(`  npm install -g pnpm@${REQUIREMENTS.pnpm.exact}`));
		return false;
	}

	const spinner = ora(`Installing pnpm@${REQUIREMENTS.pnpm.exact}`).start();
	
	const result = spawnSync("npm", ["install", "-g", `pnpm@${REQUIREMENTS.pnpm.exact}`], {
		stdio: "pipe",
		shell: true,
		encoding: "utf-8",
	});

	if (result.status === 0) {
		spinner.succeed(chalk.green("pnpm installed successfully"));
		
		// Verify installation
		await new Promise(resolve => setTimeout(resolve, 1000));
		const version = getVersion("pnpm --version");
		if (version) {
			logSuccess(`Verified: pnpm ${version}`);
			return true;
		}
		
		return true;
	}
	
	spinner.fail(chalk.red("Failed to install pnpm"));
	if (result.stderr) {
		console.log(chalk.red(result.stderr));
	}
	return false;
}

async function installPython() {
	console.log();
	console.log(chalk.bold.cyan(`${SYMBOLS.install} Installing Python ${REQUIREMENTS.python.recommended}`));
	logInfo("Python is required for AWS CLI and LocalStack tools");
	console.log();

	if (!checkCommandExists("brew")) {
		logError("Homebrew is required to install Python");
		logInfo("Please install Homebrew first or manually install Python from: https://www.python.org");
		return false;
	}

	const confirm = await askYesNo("Install Python via Homebrew?", true);
	if (!confirm) {
		logWarning("Skipped Python installation");
		console.log(chalk.yellow("\nManual installation:"));
		console.log(chalk.dim("  brew install python@3.11"));
		console.log(chalk.dim("  Or download from: https://www.python.org"));
		return false;
	}

	const spinner = ora("Installing Python 3.11 (this may take a few minutes)").start();
	
	const result = spawnSync("brew", ["install", "python@3.11"], {
		stdio: "pipe",
		shell: true,
		encoding: "utf-8",
	});

	if (result.status === 0) {
		spinner.succeed(chalk.green("Python installed successfully"));
		
		// Verify installation
		await new Promise(resolve => setTimeout(resolve, 1000));
		const version = getVersion("python3 --version");
		if (version) {
			logSuccess(`Verified: ${version}`);
			return true;
		}
		
		return true;
	}
	
	spinner.fail(chalk.red("Failed to install Python"));
	if (result.stderr) {
		console.log(chalk.red(result.stderr));
	}
	return false;
}

async function installAwsCli() {
	console.log();
	console.log(chalk.bold.cyan(`${SYMBOLS.install} Installing AWS CLI`));
	logInfo("AWS CLI is used to interact with AWS services (via LocalStack)");
	console.log();

	if (!checkCommandExists("brew")) {
		logError("Homebrew is required to install AWS CLI");
		const usePip = await askYesNo("Install AWS CLI via pip instead?", false);
		
		if (usePip) {
			const spinner = ora("Installing AWS CLI via pip").start();
			const result = spawnSync("pip3", ["install", "awscli"], {
				stdio: "pipe",
				shell: true,
				encoding: "utf-8",
			});
			
			if (result.status === 0) {
				spinner.succeed(chalk.green("AWS CLI installed successfully"));
				const version = getVersion("aws --version");
				if (version) logSuccess(`Verified: ${version}`);
				return true;
			}
			
			spinner.fail(chalk.red("Failed to install AWS CLI"));
			return false;
		}
		return false;
	}

	const confirm = await askYesNo("Install AWS CLI via Homebrew?", true);
	if (!confirm) {
		logWarning("Skipped AWS CLI installation");
		console.log(chalk.yellow("\nManual installation:"));
		console.log(chalk.dim("  brew install awscli"));
		console.log(chalk.dim("  Or: pip3 install awscli"));
		return false;
	}

	const spinner = ora("Installing AWS CLI").start();
	
	const result = spawnSync("brew", ["install", "awscli"], {
		stdio: "pipe",
		shell: true,
		encoding: "utf-8",
	});

	if (result.status === 0) {
		spinner.succeed(chalk.green("AWS CLI installed successfully"));
		
		await new Promise(resolve => setTimeout(resolve, 1000));
		const version = getVersion("aws --version");
		if (version) {
			logSuccess(`Verified: ${version.split(" ")[0]}`);
			return true;
		}
		
		return true;
	}
	
	spinner.fail(chalk.red("Failed to install AWS CLI"));
	if (result.stderr) {
		console.log(chalk.red(result.stderr));
	}
	return false;
}

async function installAwsLocal() {
	console.log();
	console.log(chalk.bold.cyan(`${SYMBOLS.install} Installing awslocal wrapper`));
	logInfo("awslocal is a wrapper for AWS CLI to work with LocalStack");
	console.log();

	const confirm = await askYesNo("Install awslocal via pip?", true);
	if (!confirm) {
		logWarning("Skipped awslocal installation");
		console.log(chalk.yellow("\nManual installation:"));
		console.log(chalk.dim("  pip3 install awscli-local"));
		return false;
	}

	const pipCmd = checkCommandExists("pip3") ? "pip3" : "pip";
	const spinner = ora("Installing awscli-local").start();
	
	const result = spawnSync(pipCmd, ["install", "awscli-local"], {
		stdio: "pipe",
		shell: true,
		encoding: "utf-8",
	});

	if (result.status === 0) {
		spinner.succeed(chalk.green("awslocal installed successfully"));
		
		await new Promise(resolve => setTimeout(resolve, 1000));
		if (checkCommandExists("awslocal")) {
			logSuccess("Verified: awslocal available");
			return true;
		}
		
		logWarning("awslocal installed but not in PATH");
		const pythonUserBase = getVersion(`${checkCommandExists("python3") ? "python3" : "python"} -m site --user-base`);
		if (pythonUserBase) {
			const binPath = join(pythonUserBase.trim(), "bin");
			await addToPath(binPath, "awslocal (Python user packages)");
		}
		
		return true;
	}
	
	spinner.fail(chalk.red("Failed to install awslocal"));
	if (result.stderr) {
		console.log(chalk.red(result.stderr));
	}
	return false;
}

async function installDocker() {
	console.log();
	console.log(chalk.bold.cyan(`${SYMBOLS.install} Installing Docker Desktop`));
	logInfo("Docker is required to run LocalStack");
	console.log();

	if (platform() !== "darwin") {
		logWarning("Automatic Docker installation only supported on macOS");
		console.log(chalk.yellow("\nManual installation:"));
		console.log(chalk.dim("  Download from: https://www.docker.com/products/docker-desktop"));
		return false;
	}

	if (!checkCommandExists("brew")) {
		logError("Homebrew is required to install Docker Desktop");
		console.log(chalk.yellow("\nManual installation:"));
		console.log(chalk.dim("  Download from: https://www.docker.com/products/docker-desktop"));
		return false;
	}

	const confirm = await askYesNo("Install Docker Desktop via Homebrew?", true);
	if (!confirm) {
		logWarning("Skipped Docker installation");
		console.log(chalk.yellow("\nManual installation:"));
		console.log(chalk.dim("  brew install --cask docker"));
		console.log(chalk.dim("  Or download from: https://www.docker.com/products/docker-desktop"));
		return false;
	}

	const spinner = ora("Installing Docker Desktop (this may take several minutes)").start();
	
	const result = spawnSync("brew", ["install", "--cask", "docker"], {
		stdio: "pipe",
		shell: true,
		encoding: "utf-8",
	});

	if (result.status === 0) {
		spinner.succeed(chalk.green("Docker Desktop installed successfully"));
		
		console.log();
		logWarning("Docker Desktop installed but not running");
		logInfo("Please:");
		console.log(chalk.yellow("  1. Open Docker Desktop from Applications"));
		console.log(chalk.yellow("  2. Wait for it to start (whale icon in menu bar)"));
		console.log(chalk.yellow("  3. Re-run this setup script"));
		console.log();
		
		const waitForDocker = await askYesNo("Have you started Docker Desktop?", false);
		if (waitForDocker) {
			const checkSpinner = ora("Waiting for Docker to start").start();
			
			for (let i = 0; i < 30; i++) {
				await new Promise(resolve => setTimeout(resolve, 2000));
				if (executeCommand("docker info 2>&1").success) {
					checkSpinner.succeed(chalk.green("Docker is running"));
					return true;
				}
			}
			
			checkSpinner.fail(chalk.red("Docker did not start within 60 seconds"));
			logWarning("Please ensure Docker Desktop is running and try again");
		}
		
		return true;
	}
	
	spinner.fail(chalk.red("Failed to install Docker Desktop"));
	if (result.stderr) {
		console.log(chalk.red(result.stderr));
	}
	return false;
}

async function installGit() {
	console.log();
	console.log(chalk.bold.cyan(`${SYMBOLS.install} Installing Git`));
	logInfo("Git is recommended for version control");
	console.log();

	if (!checkCommandExists("brew")) {
		logWarning("Homebrew not available");
		console.log(chalk.yellow("\nManual installation:"));
		console.log(chalk.dim("  Download from: https://git-scm.com"));
		return false;
	}

	const confirm = await askYesNo("Install Git via Homebrew?", true);
	if (!confirm) {
		logWarning("Skipped Git installation");
		return false;
	}

	const spinner = ora("Installing Git").start();
	
	const result = spawnSync("brew", ["install", "git"], {
		stdio: "pipe",
		shell: true,
		encoding: "utf-8",
	});

	if (result.status === 0) {
		spinner.succeed(chalk.green("Git installed successfully"));
		const version = getVersion("git --version");
		if (version) logSuccess(`Verified: ${version}`);
		return true;
	}
	
	spinner.fail(chalk.red("Failed to install Git"));
	return false;
}

async function installJq() {
	console.log();
	console.log(chalk.bold.cyan(`${SYMBOLS.install} Installing jq (JSON processor)`));
	logInfo("jq is useful for parsing JSON in command line");
	console.log();

	if (!checkCommandExists("brew")) {
		logWarning("Homebrew not available");
		return false;
	}

	const confirm = await askYesNo("Install jq via Homebrew?", true);
	if (!confirm) {
		logWarning("Skipped jq installation");
		return false;
	}

	const spinner = ora("Installing jq").start();
	
	const result = spawnSync("brew", ["install", "jq"], {
		stdio: "pipe",
		shell: true,
		encoding: "utf-8",
	});

	if (result.status === 0) {
		spinner.succeed(chalk.green("jq installed successfully"));
		const version = getVersion("jq --version");
		if (version) logSuccess(`Verified: ${version}`);
		return true;
	}
	
	spinner.fail(chalk.red("Failed to install jq"));
	return false;
}

class PrerequisiteChecker {
	constructor() {
		this.results = {
			passed: [],
			warnings: [],
			errors: [],
			info: [],
		};
		this.missingTools = [];
	}

	async checkOperatingSystem() {
		const spinner = ora("Checking operating system").start();
		await new Promise((resolve) => setTimeout(resolve, 300));

		const os = platform();
		const isMacOS = os === "darwin";

		if (isMacOS) {
			spinner.succeed(chalk.green(`Operating System: macOS ${chalk.dim("(recommended)")}`));
			this.results.passed.push({ name: "Operating System", value: "macOS" });
		} else {
			spinner.warn(chalk.yellow(`Operating System: ${os} ${chalk.dim("(macOS recommended)")}`));
			this.results.warnings.push({
				name: "Operating System",
				message: `${os} detected. This setup is optimized for macOS.`,
			});
		}
	}

	async checkHomebrew() {
		const spinner = ora("Checking Homebrew").start();
		await new Promise((resolve) => setTimeout(resolve, 200));

		if (platform() !== "darwin") {
			spinner.info(chalk.dim("Homebrew check skipped (not macOS)"));
			return;
		}

		if (!checkCommandExists("brew")) {
			spinner.fail(chalk.red("Homebrew not installed (required for easy installation)"));
			this.results.errors.push({
				name: "Homebrew",
				message: "Not installed. Required for installing other tools.",
			});
			this.missingTools.push({ name: "Homebrew", installer: installHomebrew, required: true });
		} else {
			const version = getVersion("brew --version");
			const versionStr = version ? version.split("\n")[0] : "installed";
			spinner.succeed(chalk.green(`Homebrew: ${versionStr}`));
			this.results.passed.push({ name: "Homebrew", value: versionStr });
		}
	}

	async checkNodeVersion() {
		const spinner = ora("Checking Node.js").start();
		await new Promise((resolve) => setTimeout(resolve, 300));

		if (!checkCommandExists("node")) {
			spinner.fail(chalk.red("Node.js not installed"));
			this.results.errors.push({
				name: "Node.js",
				message: `Required ${REQUIREMENTS.node.min}+`,
			});
			this.missingTools.push({ name: "Node.js", installer: installNode, required: true });
			return;
		}

		const versionOutput = getVersion("node --version");
		if (!versionOutput) {
			spinner.fail(chalk.red("Cannot determine Node.js version"));
			this.results.errors.push({
				name: "Node.js",
				message: "Cannot determine version",
			});
			return;
		}

		const comparison = compareVersions(versionOutput, REQUIREMENTS.node.min);

		if (comparison >= 0) {
			spinner.succeed(
				chalk.green(
					`Node.js: ${versionOutput} ${chalk.dim(`(required: ${REQUIREMENTS.node.min}+)`)}`,
				),
			);
			this.results.passed.push({ name: "Node.js", value: versionOutput });
		} else {
			spinner.fail(
				chalk.red(
					`Node.js: ${versionOutput} ${chalk.dim(`(required: ${REQUIREMENTS.node.min}+)`)}`,
				),
			);
			this.results.errors.push({
				name: "Node.js",
				message: `Version ${versionOutput} is too old. Required: ${REQUIREMENTS.node.min}+`,
			});
			this.missingTools.push({ name: "Node.js (upgrade)", installer: installNode, required: true });
		}
	}

	async checkPnpmVersion() {
		const spinner = ora("Checking pnpm").start();
		await new Promise((resolve) => setTimeout(resolve, 300));

		if (!checkCommandExists("pnpm")) {
			spinner.fail(chalk.red("pnpm not installed"));
			this.results.errors.push({
				name: "pnpm",
				message: `Required ${REQUIREMENTS.pnpm.exact}`,
			});
			this.missingTools.push({ name: "pnpm", installer: installPnpm, required: true });
			return;
		}

		const versionOutput = getVersion("pnpm --version");
		if (!versionOutput) {
			spinner.fail(chalk.red("Cannot determine pnpm version"));
			this.results.errors.push({
				name: "pnpm",
				message: "Cannot determine version",
			});
			return;
		}

		const comparison = compareVersions(versionOutput, REQUIREMENTS.pnpm.min);

		if (comparison >= 0) {
			spinner.succeed(
				chalk.green(
					`pnpm: ${versionOutput} ${chalk.dim(`(required: ${REQUIREMENTS.pnpm.min}+)`)}`,
				),
			);
			this.results.passed.push({ name: "pnpm", value: versionOutput });
		} else {
			spinner.fail(
				chalk.red(
					`pnpm: ${versionOutput} ${chalk.dim(`(required: ${REQUIREMENTS.pnpm.min}+)`)}`,
				),
			);
			this.results.errors.push({
				name: "pnpm",
				message: `Version ${versionOutput} is too old. Required: ${REQUIREMENTS.pnpm.min}+`,
			});
			this.missingTools.push({ name: "pnpm (upgrade)", installer: installPnpm, required: true });
		}
	}

	async checkPython() {
		const spinner = ora("Checking Python").start();
		await new Promise((resolve) => setTimeout(resolve, 300));

		const pythonCmd = checkCommandExists("python3") ? "python3" : checkCommandExists("python") ? "python" : null;

		if (!pythonCmd) {
			spinner.fail(chalk.red("Python not found"));
			this.results.errors.push({
				name: "Python",
				message: "Required for AWS CLI and LocalStack tools",
			});
			this.missingTools.push({ name: "Python", installer: installPython, required: true });
			return;
		}

		const versionOutput = getVersion(`${pythonCmd} --version`);
		if (!versionOutput) {
			spinner.warn(chalk.yellow("Cannot determine Python version"));
			this.results.warnings.push({
				name: "Python",
				message: "Installed but cannot determine version",
			});
			return;
		}

		const comparison = compareVersions(versionOutput, REQUIREMENTS.python.min);

		if (comparison >= 0) {
			spinner.succeed(
				chalk.green(
					`Python: ${versionOutput} ${chalk.dim(`(${pythonCmd})`)}`,
				),
			);
			this.results.passed.push({ name: "Python", value: versionOutput });
		} else {
			spinner.warn(
				chalk.yellow(
					`Python: ${versionOutput} ${chalk.dim(`(recommended: ${REQUIREMENTS.python.min}+)`)}`,
				),
			);
			this.results.warnings.push({
				name: "Python",
				message: `Version ${versionOutput} is old. Recommended: ${REQUIREMENTS.python.min}+`,
			});
		}
	}

	async checkPip() {
		const spinner = ora("Checking pip").start();
		await new Promise((resolve) => setTimeout(resolve, 200));

		const pipCmd = checkCommandExists("pip3") ? "pip3" : checkCommandExists("pip") ? "pip" : null;

		if (!pipCmd) {
			spinner.warn(chalk.yellow("pip not found"));
			this.results.warnings.push({
				name: "pip",
				message: "Not installed. Will be available after Python installation.",
			});
			return;
		}

		const version = getVersion(`${pipCmd} --version`);
		if (version) {
			spinner.succeed(chalk.green(`pip: ${version.split(" ")[1]} ${chalk.dim(`(${pipCmd})`)}`));
			this.results.passed.push({ name: "pip", value: version });
		} else {
			spinner.succeed(chalk.green("pip: installed"));
			this.results.passed.push({ name: "pip", value: "installed" });
		}
	}

	async checkAwsCli() {
		const spinner = ora("Checking AWS CLI").start();
		await new Promise((resolve) => setTimeout(resolve, 300));

		if (!checkCommandExists("aws")) {
			spinner.warn(chalk.yellow("AWS CLI not installed (recommended)"));
			this.results.warnings.push({
				name: "AWS CLI",
				message: "Not installed. Recommended for AWS interactions.",
			});
			this.missingTools.push({ name: "AWS CLI", installer: installAwsCli, required: false });
			return;
		}

		const version = getVersion("aws --version");
		if (version) {
			const versionMatch = version.match(/aws-cli\/([^\s]+)/);
			const versionStr = versionMatch ? versionMatch[1] : version.split(" ")[0];
			spinner.succeed(chalk.green(`AWS CLI: ${versionStr}`));
			this.results.passed.push({ name: "AWS CLI", value: versionStr });
		} else {
			spinner.succeed(chalk.green("AWS CLI: installed"));
			this.results.passed.push({ name: "AWS CLI", value: "installed" });
		}
	}

	async checkAwsLocal() {
		const spinner = ora("Checking awslocal").start();
		await new Promise((resolve) => setTimeout(resolve, 300));

		if (!checkCommandExists("awslocal")) {
			spinner.warn(chalk.yellow("awslocal not installed (recommended)"));
			this.results.warnings.push({
				name: "awslocal",
				message: "Not installed. Useful for LocalStack interactions.",
			});
			this.missingTools.push({ name: "awslocal", installer: installAwsLocal, required: false });
			return;
		}

		spinner.succeed(chalk.green("awslocal: installed"));
		this.results.passed.push({ name: "awslocal", value: "installed" });
	}

	async checkDocker() {
		const spinner = ora("Checking Docker").start();
		await new Promise((resolve) => setTimeout(resolve, 400));

		if (!checkCommandExists("docker")) {
			spinner.fail(chalk.red("Docker not installed"));
			this.results.errors.push({
				name: "Docker",
				message: "Required to run LocalStack",
			});
			this.missingTools.push({ name: "Docker", installer: installDocker, required: true });
			return;
		}

		const infoResult = executeCommand("docker info 2>&1");
		if (!infoResult.success || infoResult.output.includes("Cannot connect")) {
			spinner.fail(chalk.red("Docker installed but not running"));
			this.results.errors.push({
				name: "Docker",
				message: "Installed but not running. Start Docker Desktop.",
			});
			return;
		}

		const versionOutput = getVersion("docker --version");
		const versionMatch = versionOutput?.match(/Docker version ([^,]+)/);
		const versionStr = versionMatch ? versionMatch[1] : versionOutput;

		spinner.succeed(chalk.green(`Docker: ${versionStr} ${chalk.dim("(running)")}`));
		this.results.passed.push({ name: "Docker", value: versionStr });
	}

	async checkDockerCompose() {
		const spinner = ora("Checking Docker Compose").start();
		await new Promise((resolve) => setTimeout(resolve, 200));

		if (!checkCommandExists("docker")) {
			spinner.info(chalk.dim("Docker Compose check skipped (Docker not installed)"));
			return;
		}

		const result = executeCommand("docker compose version");
		if (result.success) {
			const versionMatch = result.output.match(/version v?([^\s]+)/);
			const versionStr = versionMatch ? versionMatch[1] : result.output;
			spinner.succeed(chalk.green(`Docker Compose: ${versionStr}`));
			this.results.passed.push({ name: "Docker Compose", value: versionStr });
		} else {
			spinner.fail(chalk.red("Docker Compose not available"));
			this.results.errors.push({
				name: "Docker Compose",
				message: "Not available. Update Docker Desktop.",
			});
		}
	}

	async checkGit() {
		const spinner = ora("Checking Git").start();
		await new Promise((resolve) => setTimeout(resolve, 200));

		if (!checkCommandExists("git")) {
			spinner.warn(chalk.yellow("Git not installed (optional but recommended)"));
			this.results.warnings.push({
				name: "Git",
				message: "Not installed (optional)",
			});
			this.missingTools.push({ name: "Git", installer: installGit, required: false });
			return;
		}

		const version = getVersion("git --version");
		const versionMatch = version?.match(/git version ([^\s]+)/);
		const versionStr = versionMatch ? versionMatch[1] : version;
		spinner.succeed(chalk.green(`Git: ${versionStr}`));
		this.results.passed.push({ name: "Git", value: versionStr });
	}

	async checkJq() {
		const spinner = ora("Checking jq").start();
		await new Promise((resolve) => setTimeout(resolve, 200));

		if (!checkCommandExists("jq")) {
			spinner.warn(chalk.yellow("jq not installed (optional)"));
			this.results.warnings.push({
				name: "jq",
				message: "Not installed (optional)",
			});
			this.missingTools.push({ name: "jq", installer: installJq, required: false });
			return;
		}

		const version = getVersion("jq --version");
		spinner.succeed(chalk.green(`jq: ${version || "installed"}`));
		this.results.passed.push({ name: "jq", value: version || "installed" });
	}

	async checkCdkLocal() {
		const spinner = ora("Checking cdklocal").start();
		await new Promise((resolve) => setTimeout(resolve, 200));

		const cdklocalPath = join(process.cwd(), "apps/infra/node_modules/.bin/cdklocal");

		if (existsSync(cdklocalPath) || checkCommandExists("cdklocal")) {
			spinner.succeed(chalk.green("cdklocal: installed"));
			this.results.passed.push({ name: "cdklocal", value: "installed" });
		} else {
			spinner.info(chalk.dim("cdklocal: will be installed with pnpm install"));
			this.results.info.push("cdklocal will be available after dependency installation");
		}
	}

	async checkEnvironmentFile() {
		const spinner = ora("Checking .env file").start();
		await new Promise((resolve) => setTimeout(resolve, 200));

		const envPath = join(process.cwd(), ".env");
		const envExamplePath = join(process.cwd(), ".env.example");

		if (existsSync(envPath)) {
			spinner.succeed(chalk.green(".env file exists"));
			this.results.passed.push({ name: ".env file", value: "exists" });
		} else if (existsSync(envExamplePath)) {
			spinner.warn(chalk.yellow(".env file missing (will be created)"));
			this.results.warnings.push({
				name: ".env file",
				message: "Will be created during setup",
			});
		} else {
			spinner.fail(chalk.red(".env.example missing"));
			this.results.errors.push({
				name: ".env file",
				message: "Template file missing",
			});
		}
	}

	async checkDependencies() {
		const spinner = ora("Checking dependencies").start();
		await new Promise((resolve) => setTimeout(resolve, 200));

		const nodeModulesPath = join(process.cwd(), "node_modules");

		if (existsSync(nodeModulesPath)) {
			spinner.succeed(chalk.green("Dependencies installed"));
			this.results.passed.push({ name: "Dependencies", value: "installed" });
		} else {
			spinner.warn(chalk.yellow("Dependencies not installed"));
			this.results.warnings.push({
				name: "Dependencies",
				message: "Will be installed during setup",
			});
		}
	}

	async runAllChecks() {
		logSection("CHECKING PREREQUISITES");

		await this.checkOperatingSystem();
		await this.checkHomebrew();
		await this.checkNodeVersion();
		await this.checkPnpmVersion();
		await this.checkPython();
		await this.checkPip();
		await this.checkAwsCli();
		await this.checkAwsLocal();
		await this.checkDocker();
		await this.checkDockerCompose();
		await this.checkGit();
		await this.checkJq();
		await this.checkCdkLocal();
		await this.checkEnvironmentFile();
		await this.checkDependencies();

		return {
			passed: this.results.errors.length === 0,
			hasWarnings: this.results.warnings.length > 0,
			...this.results,
		};
	}

	displaySummary() {
		logSection("SUMMARY");

		const total =
			this.results.passed.length +
			this.results.warnings.length +
			this.results.errors.length;

		console.log(chalk.bold(`Total checks: ${total}`));
		console.log(
			chalk.green(`${SYMBOLS.success} Passed: ${this.results.passed.length}`),
		);
		console.log(
			chalk.yellow(`${SYMBOLS.warning} Warnings: ${this.results.warnings.length}`),
		);
		console.log(chalk.red(`${SYMBOLS.error} Errors: ${this.results.errors.length}`));
		console.log();

		if (this.results.errors.length > 0) {
			console.log(chalk.red.bold("Required fixes:"));
			for (const error of this.results.errors) {
				console.log(chalk.red(`  ${SYMBOLS.error} ${error.name}: ${error.message}`));
			}
			console.log();
		}

		if (this.results.warnings.length > 0) {
			console.log(chalk.yellow.bold("Optional improvements:"));
			for (const warning of this.results.warnings) {
				console.log(
					chalk.yellow(`  ${SYMBOLS.warning} ${warning.name}: ${warning.message}`),
				);
			}
			console.log();
		}

		if (this.results.info.length > 0) {
			for (const info of this.results.info) {
				logInfo(info);
			}
			console.log();
		}
	}

	async installMissingTools() {
		if (this.missingTools.length === 0) {
			logSuccess("All required tools are installed!");
			return true;
		}

		logSection("INSTALLING MISSING TOOLS");

		const requiredTools = this.missingTools.filter(t => t.required);
		const optionalTools = this.missingTools.filter(t => !t.required);

		console.log(chalk.bold(`Found ${requiredTools.length} required and ${optionalTools.length} optional missing tools\n`));

		// Install required tools first
		for (const tool of requiredTools) {
			console.log(chalk.cyan.bold(`\n${"─".repeat(60)}`));
			console.log(chalk.cyan.bold(`Required: ${tool.name}`));
			console.log(chalk.cyan.bold(`${"─".repeat(60)}\n`));
			
			const installed = await tool.installer();
			
			if (!installed) {
				logError(`Failed to install required tool: ${tool.name}`);
				const continueAnyway = await askYesNo("Continue setup anyway?", false);
				if (!continueAnyway) {
					return false;
				}
			}
			
			// Small delay between installations
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		// Ask about optional tools
		if (optionalTools.length > 0) {
			console.log();
			const installOptional = await askYesNo(
				`Install ${optionalTools.length} optional tool(s) (${optionalTools.map(t => t.name).join(", ")})?`,
				true
			);

			if (installOptional) {
				for (const tool of optionalTools) {
					console.log(chalk.cyan.bold(`\n${"─".repeat(60)}`));
					console.log(chalk.cyan.bold(`Optional: ${tool.name}`));
					console.log(chalk.cyan.bold(`${"─".repeat(60)}\n`));
					
					await tool.installer();
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			}
		}

		return true;
	}
}

async function setupEnvironmentFile() {
	logSection("ENVIRONMENT SETUP");

	const envPath = join(process.cwd(), ".env");
	const envExamplePath = join(process.cwd(), ".env.example");

	if (existsSync(envPath)) {
		logInfo(".env file already exists");
		const overwrite = await askYesNo("Do you want to reconfigure it?", false);
		if (!overwrite) {
			return;
		}
	}

	if (!existsSync(envExamplePath)) {
		logError(".env.example not found. Cannot proceed.");
		return;
	}

	const spinner = ora("Creating .env file from template").start();
	await new Promise((resolve) => setTimeout(resolve, 500));

	const envContent = readFileSync(envExamplePath, "utf-8");
	writeFileSync(envPath, envContent);

	spinner.succeed(chalk.green("Created .env file"));
	console.log();

	const configureNow = await askYesNo(
		"Do you want to configure LocalStack and Next.js secrets now?",
		true,
	);

	if (!configureNow) {
		logInfo("You can manually edit .env later");
		return;
	}

	let updatedEnv = readFileSync(envPath, "utf-8");

	// LocalStack configuration
	console.log();
	console.log(chalk.bold.cyan("📝 LocalStack Configuration"));
	logInfo("Get your auth token from: https://app.localstack.cloud/workspace/auth-token");
	const localstackToken = await askInput("Enter your LocalStack auth token", "");

	if (localstackToken && localstackToken.length > 10) {
		updatedEnv = updatedEnv.replace(
			/LOCALSTACK_AUTH_TOKEN=.*/,
			`LOCALSTACK_AUTH_TOKEN=${localstackToken}`,
		);
		logSuccess("LocalStack token configured");
	} else {
		logWarning("Skipping LocalStack token (you can add it later)");
	}

	// Next.js token secret
	console.log();
	console.log(chalk.bold.cyan("🔐 Next.js Token Secret"));
	logInfo("This should be a random 32+ character string");
	const generateRandom = await askYesNo("Generate a random token automatically?", true);

	let nextToken = "";
	if (generateRandom) {
		nextToken = Array.from({ length: 32 }, () =>
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
				Math.floor(Math.random() * 62),
			),
		).join("");
		logSuccess("Generated random token");
	} else {
		nextToken = await askInput("Enter your Next.js token secret", "");
	}

	if (nextToken && nextToken.length >= 32) {
		updatedEnv = updatedEnv.replace(
			/NEXT_TOKEN_SECRET=.*/,
			`NEXT_TOKEN_SECRET=${nextToken}`,
		);
		logSuccess("Next.js token configured");
	} else if (nextToken) {
		logWarning("Token too short (min 32 chars), keeping default");
	}

	writeFileSync(envPath, updatedEnv);
	console.log();
	logSuccess("Environment file configured");
}

async function installDependencies() {
	logSection("INSTALLING DEPENDENCIES");

	const nodeModulesPath = join(process.cwd(), "node_modules");

	if (existsSync(nodeModulesPath)) {
		const reinstall = await askYesNo("Dependencies already installed. Reinstall?", false);
		if (!reinstall) {
			logInfo("Skipping dependency installation");
			return;
		}
	}

	const spinner = ora("Running pnpm install (this may take a few minutes)").start();

	const result = spawnSync("pnpm", ["install"], {
		stdio: "pipe",
		shell: true,
		encoding: "utf-8",
	});

	if (result.status === 0) {
		spinner.succeed(chalk.green("Dependencies installed successfully"));
	} else {
		spinner.fail(chalk.red("Failed to install dependencies"));
		if (result.stderr) {
			console.log(chalk.red(result.stderr));
		}
		throw new Error("Dependency installation failed");
	}
}

async function verifySetup() {
	logSection("SETUP VERIFICATION");

	const checks = [
		{ name: ".env exists", fn: () => existsSync(join(process.cwd(), ".env")) },
		{ name: "node_modules exists", fn: () => existsSync(join(process.cwd(), "node_modules")) },
		{ name: "Docker running", fn: () => executeCommand("docker info 2>&1").success },
	];

	let allPassed = true;
	for (const check of checks) {
		const spinner = ora(check.name).start();
		await new Promise((resolve) => setTimeout(resolve, 200));

		const passed = check.fn();
		if (passed) {
			spinner.succeed(chalk.green(check.name));
		} else {
			spinner.fail(chalk.red(check.name));
			allPassed = false;
		}
	}

	return allPassed;
}

async function showNextSteps() {
	logSection("NEXT STEPS");

	console.log(chalk.bold.green("🚀 Your development environment is ready!\n"));

	console.log(chalk.cyan.bold("To start developing:\n"));

	const steps = [
		{ num: "1", cmd: "pnpm local:up", desc: "Start LocalStack" },
		{ num: "2", cmd: "pnpm infra:bootstrap", desc: "Bootstrap CDK (first time only)" },
		{ num: "3", cmd: "pnpm infra:deploy", desc: "Deploy infrastructure" },
		{ num: "4", cmd: "pnpm --filter @earthquake/web dev", desc: "Start Next.js dashboard" },
	];

	for (const step of steps) {
		console.log(`  ${chalk.bold(step.num + ".")} ${step.desc}:`);
		console.log(`     ${chalk.dim(step.cmd)}\n`);
	}

	console.log(chalk.cyan.bold("Useful commands:\n"));

	const commands = [
		{ cmd: "pnpm test", desc: "Run all tests" },
		{ cmd: "pnpm lint", desc: "Check code quality" },
		{ cmd: "pnpm build", desc: "Build all packages" },
		{ cmd: "pnpm infra:destroy", desc: "Tear down infrastructure" },
		{ cmd: "pnpm local:down", desc: "Stop LocalStack" },
	];

	for (const { cmd, desc } of commands) {
		console.log(`  ${chalk.dim(cmd.padEnd(25))} - ${desc}`);
	}

	console.log();
	console.log(chalk.cyan.bold("Documentation:\n"));

	const docs = [
		"README.md                           - Project overview",
		"SETUP.md                            - Detailed setup guide",
		"QUICKSTART.md                       - Quick reference card",
	];

	for (const doc of docs) {
		console.log(`  ${chalk.dim(doc)}`);
	}

	console.log();
	console.log(chalk.green.bold("Happy coding! 🎉"));
	console.log();
}


async function main() {
	console.clear();

	console.log(
		chalk.cyan.bold(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          🌍 EARTHQUAKE DATA PLATFORM SETUP 🌍             ║
║                                                            ║
║           Interactive Development Environment             ║
║                    Setup Wizard                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`),
	);

	console.log(chalk.bold("Welcome! This script will check and install everything you need.\n"));

	logInfo("This setup is optimized for macOS with modern tooling");
	logInfo("Other Unix systems may work but are not officially supported");
	console.log();

	try {
		const proceed = await askYesNo("Ready to begin setup?", true);
		if (!proceed) {
			console.log(chalk.yellow("\nSetup cancelled."));
			if (rl && !rl.closed) rl.close();
			return;
		}
	} catch (error) {
		if (error.code === "ABORT_ERR" || error.name === "AbortError") {
			console.log();
			logWarning("Setup cancelled by user (Ctrl+C)");
			console.log();
			if (rl && !rl.closed) rl.close();
			return;
		}
		throw error;
	}

	try {
		// Initial check
		const checker = new PrerequisiteChecker();
		const result = await checker.runAllChecks();

		console.log();
		checker.displaySummary();

		if (!result.passed) {
			console.log();
			logInfo("Don't worry! I can help you install the missing tools.");
			console.log();
			
			const installMissing = await askYesNo("Install missing tools now?", true);
			
			if (installMissing) {
				const installSuccess = await checker.installMissingTools();
				
				if (!installSuccess) {
					logError("Setup aborted due to installation failures");
					console.log();
					logInfo("Check SETUP.md for manual installation instructions");
					if (rl && !rl.closed) rl.close();
					process.exit(1);
				}
				
				// Re-check after installation
				console.log();
				logSection("RE-CHECKING PREREQUISITES");
				const recheckerSpinner = ora("Verifying installations").start();
				await new Promise(resolve => setTimeout(resolve, 1000));
				recheckerSpinner.stop();
				
				const rechecker = new PrerequisiteChecker();
				const recheck = await rechecker.runAllChecks();
				
				console.log();
				rechecker.displaySummary();
				
				if (!recheck.passed) {
					logWarning("Some required tools are still missing");
					const continueAnyway = await askYesNo("Continue with setup anyway?", false);
					if (!continueAnyway) {
						if (rl && !rl.closed) rl.close();
						return;
					}
				}
			} else {
				logWarning("Skipping tool installation");
				console.log();
				logInfo("You can install tools manually and re-run this script");
				if (rl && !rl.closed) rl.close();
				return;
			}
		}

		if (result.hasWarnings) {
			console.log();
			const continueWithWarnings = await askYesNo(
				"Some optional items are missing. Continue?",
				true,
			);
			if (!continueWithWarnings) {
				console.log(chalk.yellow("\nSetup cancelled."));
				if (rl && !rl.closed) rl.close();
				return;
			}
		}

		// Small pause before continuing to next section
		await new Promise(resolve => setTimeout(resolve, 500));

		await setupEnvironmentFile();
		await installDependencies();

		console.log();
		const setupValid = await verifySetup();

		if (setupValid) {
			console.log();
			logSuccess("Setup completed successfully!");
			await showNextSteps();
		} else {
			console.log();
			logError("Setup incomplete. Please review the errors above.");
		}
	} catch (error) {
		console.log();
		if (error.code === "ABORT_ERR" || error.name === "AbortError") {
			logWarning("Setup cancelled by user (Ctrl+C)");
			console.log();
		} else {
			logError(`Setup failed: ${error.message}`);
			if (error.stack) {
				console.log(chalk.dim(error.stack));
			}
		}
		if (rl && !rl.closed) rl.close();
		process.exit(error.code === "ABORT_ERR" || error.name === "AbortError" ? 0 : 1);
	} finally {
		if (!rl.closed) {
			if (rl && !rl.closed) rl.close();
		}
	}
}

main();
