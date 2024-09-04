## 2.4.0
### Visual changes
* Add keyboard navigation
* Add report page tooltip support
* Add font settings for axis
* Extended "Chord" settings
* Add axis background settings

### Code improvements
* Fix rendering when "Clear selection" is clicked
* Update API to 5.11.0, tools to 5.5.1
* Fix data point colors assignment, making it stable
* Fix npm vulnerabilities
* Remove "coveralls" package

## 2.3.0
* Update powerbi-visuals-api to 5.9.1
* Update powerbi-visuals-tools to 5.4.3
* Update other powerbi dependencies, 
* Migrate from puppeteer to playwright-chromium
* Migrate from tslint to eslint, fix eslint errors
* Replace larget package 'snyk' with '@snyk/protect'
* Update outdated packages
* Remove powerbi-visuals-interactivity-utils
* Refactor 'getChordTicksArcDescriptors' to show ticks for each chord

## 2.2.0
* Add context menu handling
* Update powerbi-visuals-api to 3.8.2

## 2.1.0
* API update
* browser tab crash fix

## 2.0.4
* API was downgraded to version 2.2 because of issues related with no-iframe mode
* Rendering events were removed because they aren't supported by API 2.2

## 2.0.3
* API was updated upto version 2.3
* The base libraries were update
* Was added babel polyfill
* Was added rendering events
* Rendering fixes

## 2.0.2
* Update the tools to 3.0.5

## 2.0.1
* Update packages

## 2.0.0
* Webpack migration

## 1.5.0
* API 2.1.0

## 1.4.0
* Implements High Contrast Mode

## 1.3.0
* Added localization for all supported languages

## 1.2.1
* FIX: Fixes the issue that used to force to render additional chords even if data set doesn't contain such links
* FIX: Fixes chord's tooltip

## 1.2.0
* UPD: Converted to API 1.11 to support Power BI Bookmarks
* UPD: Integrated InteractiveService to support Power BI Bookmarks
* UPD: Implemented the multi selection with Ctrl + Click

## 1.1.0
* UPD: transferred to API 1.10
* UPD: added new localization string

## 1.0.1
* Add functionality When field "Values" is absent, we can use weight === 1 for each link
* Add changelog.md