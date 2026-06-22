#!/usr/bin/env node
/**
 * start-all.js
 * Starts all CarePlus backends and frontends in parallel.
 * Each service gets a distinct color prefix in the terminal.
 * Press Ctrl+C to gracefully kill everything.
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ─── Service definitions ─────────────────────────────────────────────────────
const services = [
  // ── Backends ──────────────────────────────────────────────────────────────
  {
    label: 'super-backend   ',
    color: '\x1b[35m',           // magenta
    cwd: path.join(ROOT, 'super-admin', 'super-backend'),
    cmd: 'node',
    args: ['server.js'],
  },
  {
    label: 'admin-backend   ',
    color: '\x1b[34m',           // blue
    cwd: path.join(ROOT, 'hospital-admin', 'admin-backend'),
    cmd: 'node',
    args: ['server.js'],
  },
  {
    label: 'nurse-backend   ',
    color: '\x1b[36m',           // cyan
    cwd: path.join(ROOT, 'nurse-dashboard', 'nurse-backend'),
    cmd: 'node',
    args: ['server.js'],
  },
  {
    label: 'pharma-backend  ',
    color: '\x1b[33m',           // yellow
    cwd: path.join(ROOT, 'pharma-dashboard', 'pharma-backend'),
    cmd: 'node',
    args: ['server.js'],
  },
  {
    label: 'doctor-backend  ',
    color: '\x1b[32m',           // green
    cwd: path.join(ROOT, 'Doctor-Dashboard', 'doctor-backend'),
    cmd: 'node',
    args: ['server.js'],
  },
  {
    label: 'patient-backend ',
    color: '\x1b[31m',           // red
    cwd: path.join(ROOT, 'Patient-Dashboard', 'patient-backend'),
    cmd: 'node',
    args: ['server.js'],
  },

  // ── Frontends ─────────────────────────────────────────────────────────────
  {
    label: 'super-frontend  ',
    color: '\x1b[95m',           // bright magenta
    cwd: path.join(ROOT, 'super-admin', 'super-frontend'),
    cmd: 'npm',
    args: ['run', 'dev'],
  },
  {
    label: 'admin-frontend  ',
    color: '\x1b[94m',           // bright blue
    cwd: path.join(ROOT, 'hospital-admin', 'admin-frontend'),
    cmd: 'npm',
    args: ['run', 'dev'],
  },
  {
    label: 'nurse-frontend  ',
    color: '\x1b[96m',           // bright cyan
    cwd: path.join(ROOT, 'nurse-dashboard', 'nurse-frontend'),
    cmd: 'npm',
    args: ['run', 'dev'],
  },
  {
    label: 'pharma-frontend ',
    color: '\x1b[93m',           // bright yellow
    cwd: path.join(ROOT, 'pharma-dashboard', 'pharma-frontend'),
    cmd: 'npm',
    args: ['run', 'dev'],
  },
  {
    label: 'doctor-frontend ',
    color: '\x1b[92m',           // bright green
    cwd: path.join(ROOT, 'Doctor-Dashboard', 'doctor-frontend'),
    cmd: 'npm',
    args: ['run', 'dev'],
  },
  {
    label: 'patient-frontend',
    color: '\x1b[91m',           // bright red
    cwd: path.join(ROOT, 'Patient-Dashboard', 'patient-frontend'),
    cmd: 'npm',
    args: ['run', 'dev'],
  },
];

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function prefix(service) {
  return `${service.color}${BOLD}[${service.label}]${RESET} `;
}

function log(service, line) {
  process.stdout.write(`${prefix(service)}${line}\n`);
}

function logErr(service, line) {
  process.stderr.write(`${prefix(service)}${DIM}${line}${RESET}\n`);
}

// ─── Launch ───────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}🚀 Starting all CarePlus services…${RESET}\n`);

const processes = services.map((svc) => {
  const isWindows = process.platform === 'win32';
  // On Windows, npm must be run via shell so npm.cmd resolves correctly
  const useShell = isWindows && svc.cmd === 'npm';
  const cmd = svc.cmd;

  const child = spawn(cmd, svc.args, {
    cwd: svc.cwd,
    env: { ...process.env },
    shell: useShell,
  });

  child.stdout.on('data', (data) => {
    String(data).split('\n').forEach((line) => {
      if (line.trim()) log(svc, line);
    });
  });

  child.stderr.on('data', (data) => {
    String(data).split('\n').forEach((line) => {
      if (line.trim()) logErr(svc, line);
    });
  });

  child.on('error', (err) => {
    logErr(svc, `Failed to start: ${err.message}`);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      log(svc, `Killed (${signal})`);
    } else if (code !== 0 && code !== null) {
      logErr(svc, `Exited with code ${code}`);
    }
  });

  log(svc, `Started (pid ${child.pid})`);
  return { svc, child };
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n${BOLD}⛔ Received ${signal} — stopping all services…${RESET}\n`);
  processes.forEach(({ svc, child }) => {
    if (!child.killed) {
      log(svc, 'Stopping…');
      child.kill(signal);
    }
  });
  // Give processes 3 s to exit gracefully, then force-kill
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
