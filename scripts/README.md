# Scripts

Build, deployment, and utility scripts for the SquareX browser extension project.

## Overview

This directory contains automation scripts for building, testing, deploying, and maintaining the browser extension project across all supported platforms.

## Script Categories

### Build Scripts
- **WASM Compilation**: Rust to WebAssembly compilation
- **Extension Bundling**: Webpack bundling for each browser
- **Asset Optimization**: Image and resource optimization
- **Type Checking**: TypeScript compilation and validation

### Deployment Scripts
- **Extension Packaging**: Create distributable packages
- **Browser Store Deployment**: Automated store submissions
- **Version Management**: Semantic versioning automation
- **Release Notes**: Automated changelog generation

### Development Scripts
- **Development Server**: Local development environment
- **Hot Reloading**: Watch mode for development
- **Code Generation**: Scaffolding and boilerplate generation
- **Dependency Management**: Package management automation

### Testing Scripts
- **Test Execution**: Automated test running
- **Coverage Reports**: Test coverage generation
- **Performance Testing**: Benchmark and performance testing
- **Cross-browser Testing**: Automated browser testing

## Script Structure

```
scripts/
├── build/           # Build-related scripts
│   ├── build-wasm.sh
│   ├── build-extensions.sh
│   └── build-all.sh
├── deploy/          # Deployment scripts
│   ├── package-chrome.sh
│   ├── package-firefox.sh
│   ├── package-safari.sh
│   └── deploy-all.sh
├── dev/             # Development scripts
│   ├── dev-server.sh
│   ├── watch-mode.sh
│   └── generate-component.sh
├── test/            # Testing scripts
│   ├── run-tests.sh
│   ├── coverage-report.sh
│   └── performance-test.sh
├── utils/           # Utility scripts
│   ├── version-bump.sh
│   ├── changelog-generator.sh
│   └── dependency-check.sh
└── ci/              # CI/CD scripts
    ├── ci-build.sh
    ├── ci-test.sh
    └── ci-deploy.sh
```

## Usage

### Build Scripts

```bash
# Build WASM module
./scripts/build/build-wasm.sh

# Build all extensions
./scripts/build/build-extensions.sh

# Build everything
./scripts/build/build-all.sh
```

### Development Scripts

```bash
# Start development server
./scripts/dev/dev-server.sh

# Watch mode for development
./scripts/dev/watch-mode.sh

# Generate new component
./scripts/dev/generate-component.sh component-name
```

### Testing Scripts

```bash
# Run all tests
./scripts/test/run-tests.sh

# Generate coverage report
./scripts/test/coverage-report.sh

# Run performance tests
./scripts/test/performance-test.sh
```

### Deployment Scripts

```bash
# Package for Chrome Web Store
./scripts/deploy/package-chrome.sh

# Package for Firefox Add-ons
./scripts/deploy/package-firefox.sh

# Package for Safari App Store
./scripts/deploy/package-safari.sh

# Deploy to all stores
./scripts/deploy/deploy-all.sh
```

## Configuration

### Environment Variables

Scripts use environment variables for configuration:
- `NODE_ENV`: Development/production environment
- `BROWSER_TARGET`: Target browser for builds
- `WASM_TARGET`: WASM compilation target
- `BUILD_VERSION`: Build version number

### Configuration Files

- `scripts/config/build.json`: Build configuration
- `scripts/config/deploy.json`: Deployment configuration
- `scripts/config/test.json`: Testing configuration

## Automation

### CI/CD Integration

Scripts are designed to work with:
- **GitHub Actions**: Automated workflows
- **GitLab CI**: Continuous integration
- **Jenkins**: Build automation
- **CircleCI**: Cloud CI/CD

### Scheduled Tasks

Automated tasks include:
- **Daily builds**: Automated daily builds
- **Weekly testing**: Comprehensive test runs
- **Monthly updates**: Dependency updates and security patches

## Error Handling

### Script Robustness

All scripts include:
- **Error checking**: Validate prerequisites and dependencies
- **Logging**: Comprehensive logging for debugging
- **Rollback**: Automatic rollback on failure
- **Notifications**: Error notifications and alerts

### Common Issues

Documented solutions for:
- **Build failures**: Common build issues and fixes
- **Test failures**: Test environment problems
- **Deployment issues**: Store submission problems
- **Performance issues**: Build and runtime performance

## Maintenance

### Script Updates

- **Version tracking**: Script version management
- **Dependency updates**: Keep scripts up to date
- **Security patches**: Regular security updates
- **Documentation**: Keep documentation current

### Monitoring

- **Script performance**: Monitor execution times
- **Success rates**: Track script success/failure rates
- **Resource usage**: Monitor CPU and memory usage
- **Error patterns**: Identify common failure patterns
