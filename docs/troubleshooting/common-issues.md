# Common Issues & Solutions

This guide covers the most frequently encountered problems and their solutions for both the VSCode extension and web application.

## Installation & Setup Issues

### VSCode Extension Not Loading

#### Problem: Extension shows as installed but commands don't work
**Symptoms:**
- Extension appears in Extensions panel
- Commands don't appear in Command Palette
- Keyboard shortcuts don't respond

**Solutions:**
1. **Reload VS Code**: `Ctrl+Shift+P` → "Developer: Reload Window"
2. **Check extension status**: Extensions panel → Look for errors next to Story Mode
3. **Reinstall extension**: Uninstall and reinstall from marketplace
4. **Check VS Code version**: Ensure VS Code is up to date

#### Problem: "Story Mode: Create Story Library" command not found
**Cause:** Extension activation failed

**Solutions:**
1. **Check workspace**: Extension requires an open folder/workspace
2. **View logs**: Help → Toggle Developer Tools → Console → Look for Story Mode errors
3. **Manual activation**: Open any `.md` file to trigger extension activation

### LLM Connection Issues

#### Problem: "API Key not found" or "Unauthorized" errors
**Symptoms:**
- AI continuation fails with authentication errors
- Error messages about API keys

**Solutions:**
1. **Verify API key**: Check `.story-mode/llm-profiles/default.json` for correct API key
2. **Check key format**: Ensure no extra spaces or characters
3. **Test key separately**: Try the API key in a direct API call or other tool
4. **Check provider**: Ensure you're using the correct provider (OpenAI vs OpenRouter, etc.)

**Example correct profile:**
```json
{
  "name": "OpenAI GPT-3.5",
  "provider": "openai",
  "apiKey": "sk-proj-abcd1234...",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "model": "gpt-3.5-turbo"
}
```

#### Problem: "Model not found" or "Invalid model" errors
**Cause:** Incorrect model name for the provider

**Solutions:**
1. **Check available models**: Verify model name with your provider
2. **Update model name**: Use exact model name (e.g., "gpt-3.5-turbo" not "gpt-3.5")
3. **Provider-specific models**: Ensure model is available for your provider

**Common model names:**
- **OpenAI**: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`
- **OpenRouter**: `openai/gpt-3.5-turbo`, `anthropic/claude-3-haiku`
- **KoboldCPP**: Usually custom model name, check your local instance

#### Problem: Connection timeouts or slow responses
**Symptoms:**
- AI continuation takes very long
- Timeout errors after waiting
- Partial responses

**Solutions:**
1. **Check internet connection**: Ensure stable internet
2. **Reduce context length**: Lower `maxContextEntries` in profile
3. **Reduce max tokens**: Lower `maxTokens` setting
4. **Try different provider**: Some providers are faster than others

### File and Directory Issues

#### Problem: .story-mode folder not created
**Symptoms:**
- Commands fail with "No library found"
- Repository features don't work

**Solutions:**
1. **Check permissions**: Ensure write access to workspace folder
2. **Create manually**: Create `.story-mode` folder with subfolders:
   ```
   .story-mode/
   ├── repositories/
   │   ├── characters/
   │   ├── locations/
   │   └── objects/
   ├── llm-profiles/
   └── templates/
   ```
3. **Check workspace**: Ensure you have a folder open in VS Code

#### Problem: Repository items not being recognized
**Symptoms:**
- Character names in text don't trigger context injection
- Repository features seem broken

**Solutions:**
1. **Check file format**: Ensure repository files are `.md` format
2. **Verify keywords**: Include `**Keywords**:` line in repository items
3. **Check file location**: Files must be in correct repository subfolder
4. **Restart extension**: Reload VS Code after adding repository items

## Web Application Issues

### Loading and Performance

#### Problem: Web app won't load or shows blank page
**Solutions:**
1. **Clear browser cache**: Hard refresh with `Ctrl+F5`
2. **Check JavaScript**: Enable JavaScript in browser settings
3. **Try incognito mode**: Test in private/incognito window
4. **Check browser compatibility**: Use modern browser (Chrome, Firefox, Safari, Edge)

#### Problem: Very slow loading or freezing
**Solutions:**
1. **Close other tabs**: Free up browser memory
2. **Clear localStorage**: Browser Developer Tools → Application → Local Storage → Clear
3. **Check browser console**: F12 → Console → Look for errors
4. **Try different browser**: Test if issue is browser-specific

### Data and Storage Issues

#### Problem: Settings or data not saving
**Symptoms:**
- Configuration changes don't persist
- Stories disappear on refresh

**Solutions:**
1. **Check localStorage**: Ensure browser allows localStorage
2. **Clear storage**: Clear localStorage and recreate data
3. **Check private browsing**: Some browsers don't save data in private mode
4. **Export data first**: Use export features before troubleshooting

#### Problem: Import/export not working
**Solutions:**
1. **Check file format**: Ensure JSON format for exports
2. **File size limits**: Large files may fail import
3. **Browser permissions**: Ensure browser allows file downloads/uploads
4. **Try smaller chunks**: Import smaller amounts of data at a time

## Feature-Specific Issues

### Oracle System Problems

#### Problem: Oracle responses seem repetitive
**Cause:** Limited keyword database or caching

**Solutions:**
1. **Restart application**: Clear any caching
2. **Check spark tables**: Verify custom tables are loading
3. **Add custom keywords**: Create custom spark tables for variety

#### Problem: Oracle interpretations don't match context
**Solutions:**
1. **Provide more context**: Include more story context before Oracle queries
2. **Adjust system prompt**: Modify LLM profile system prompt for better context understanding
3. **Edit interpretations**: Treat Oracle output as suggestions, edit as needed

### AI Continuation Issues

#### Problem: AI responses don't match story tone or style
**Solutions:**
1. **Adjust system prompt**: Modify LLM profile to specify tone/style
2. **Provide more context**: Include more story history in continuation
3. **Use examples**: Add style examples in system prompt
4. **Edit output**: Treat AI output as first draft, edit to match your style

#### Problem: AI responses are too short or cut off
**Solutions:**
1. **Increase max tokens**: Raise `maxTokens` in LLM profile
2. **Check API limits**: Verify your API plan allows longer responses
3. **Continue in chunks**: Use multiple continuations for longer text

### Template System Issues

#### Problem: Templates not loading or not found
**Solutions:**
1. **Check file location**: Templates must be in `.story-mode/templates/`
2. **Verify format**: Ensure proper YAML frontmatter and Markdown content
3. **Check syntax**: Validate YAML frontmatter syntax
4. **Restart extension**: Reload VS Code after adding templates

#### Problem: Placeholder resolution not working
**Solutions:**
1. **Check placeholder syntax**: Use correct `{{placeholder}}` format
2. **Verify repository items**: Ensure referenced items exist
3. **Check keywords**: Repository items need matching keywords
4. **Debug step by step**: Test simple placeholders first

## Performance Optimization

### Speed Improvements

#### For Large Repositories
1. **Organize files**: Use clear folder structure
2. **Limit context**: Reduce `maxContextEntries` in LLM profiles
3. **Optimize keywords**: Use specific, relevant keywords only

#### For Better AI Responses
1. **Quality over quantity**: Provide focused, relevant context
2. **Clear writing**: Well-written context produces better AI responses
3. **Consistent style**: Maintain consistent tone throughout story

### Memory and Resource Usage

#### VSCode Extension
1. **Close unused files**: Reduce memory usage
2. **Restart periodically**: Clear extension memory
3. **Limit repository size**: Large repositories can slow performance

#### Web Application
1. **Regular data cleanup**: Export and clear old data
2. **Browser optimization**: Close other tabs, clear cache
3. **Limit concurrent features**: Don't use multiple AI features simultaneously

## Error Message Guide

### Common Error Messages and Solutions

#### "Failed to read LLM profile"
**Cause:** Malformed JSON in profile file
**Solution:** Validate JSON syntax in `.story-mode/llm-profiles/default.json`

#### "Repository not found"
**Cause:** Missing `.story-mode` directory
**Solution:** Run "Create Story Library" command or create directory manually

#### "Template parsing error"
**Cause:** Invalid YAML frontmatter in template
**Solution:** Check YAML syntax, ensure proper formatting

#### "Context too long"
**Cause:** Story context exceeds model limits
**Solution:** Reduce `maxContextEntries` or `maxTokens` in LLM profile

#### "Rate limit exceeded"
**Cause:** Too many API calls to provider
**Solution:** Wait before retrying, consider upgrading API plan

## Getting Additional Help

### Before Seeking Help

1. **Check this guide**: Review relevant sections above
2. **Check browser console**: F12 → Console for error messages
3. **Test with minimal setup**: Try with fresh library and simple content
4. **Gather error details**: Screenshots and exact error messages help debugging

### Where to Get Help

1. **GitHub Issues**: [Report bugs or request features](https://github.com/jebcarter-space/story-mode/issues)
2. **Discussions**: [Community help and questions](https://github.com/jebcarter-space/story-mode/discussions)
3. **Documentation**: Check other sections of this documentation
4. **FAQ**: Review [Frequently Asked Questions](faq.md)

### When Reporting Issues

Include this information:
- **Platform**: VSCode extension or web app
- **Version**: Story Mode version number
- **Environment**: Operating system, browser, VS Code version
- **Steps to reproduce**: Exact steps that cause the issue
- **Error messages**: Complete error text or screenshots
- **Configuration**: LLM provider, relevant settings (no API keys!)

---

**Still having issues?** Check our [FAQ](faq.md) for more specific questions, or [create an issue](https://github.com/jebcarter-space/story-mode/issues) on GitHub with the details above.