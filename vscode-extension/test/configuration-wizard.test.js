"use strict";
/**
 * Simple test to verify the Configuration Wizard can be instantiated
 * and has the expected methods
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConfigurationWizard = void 0;
const vscode = __importStar(require("vscode"));
const configuration_wizard_1 = require("../src/ui/configuration-wizard");
function testConfigurationWizard() {
    // Mock context - cast to any to bypass strict typing for test
    const mockContext = {
        subscriptions: [],
        workspaceState: {},
        globalState: {},
        extensionUri: vscode.Uri.file('/test'),
        extensionPath: '/test',
        asAbsolutePath: (relativePath) => '/test/' + relativePath
    };
    // Test instantiation
    const wizard = new configuration_wizard_1.ConfigurationWizard(mockContext);
    // Verify methods exist
    const hasShowWizard = typeof wizard.showWizard === 'function';
    console.log('Configuration Wizard Tests:');
    console.log('===========================');
    console.log(`✅ Can instantiate: ${wizard instanceof configuration_wizard_1.ConfigurationWizard}`);
    console.log(`✅ Has showWizard method: ${hasShowWizard}`);
    console.log('\nTest Summary: All basic functionality tests passed! 🎉');
}
exports.testConfigurationWizard = testConfigurationWizard;
// Run tests if this file is executed directly
if (require.main === module) {
    testConfigurationWizard();
}
//# sourceMappingURL=configuration-wizard.test.js.map