import 'reflect-metadata' // For Angular
import 'zone.js' // For Angular
import vrtest from 'vrtest/client'
import React from 'react'
import { render } from 'react-dom'
import Vue from 'vue'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import { NgModule, Component } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'

const requireTests = require.context('../components', true, /(js|vue)$/)
const tests = requireTests.keys().map(path => {
  const [suite, name] = path
    .replace('./', '')
    .replace(/.(js|vue)$/, '')
    .split('/')
  return {
    suite,
    name,
    case: requireTests(path),
  }
})

function getElements() {
  const rootEl = document.createElement('div')
  rootEl.style.display = 'inline-block'
  rootEl.style.padding = '8px'
  const root2El = document.createElement('div')
  rootEl.style.display = 'inline-block'
  rootEl.appendChild(root2El)

  return {
    rootEl,
    root2El,
  }
}

let suite

let elements = getElements()

function cleanUp() {
  const newElements = getElements()
  elements.rootEl.remove()
  document.body.appendChild(newElements.rootEl)

  elements = newElements
}

tests.forEach(test => {
  if (!suite || suite.name !== test.suite) {
    suite = vrtest.createSuite(test.suite)
  }

  suite.createTest(test.name, () => {
    cleanUp()

    switch (test.suite) {
      case 'react': {
        // No need to use unmountComponentAtNode
        // It's managed by React internally
        const TestCase = test.case.default
        render(<TestCase />, elements.root2El)
        break
      }
      case 'vue':
        // eslint-disable-next-line no-new
        new Vue({
          el: elements.root2El,
          ...test.case,
        })
        break
      case 'angular': {
        const selector = test.case.default.annotations[0].selector
        class AppComponent {}
        AppComponent.annotations = [
          new Component({
            selector: elements.root2El,
            template: `<${selector}></${selector}>`,
          }),
        ]

        class AppModule {}
        AppModule.annotations = [
          new NgModule({
            imports: [BrowserModule],
            declarations: [AppComponent, test.case.default],
            bootstrap: [AppComponent],
          }),
        ]

        platformBrowserDynamic().bootstrapModule(AppModule)
        break
      }
      default:
        throw new Error('Framework not supported')
    }
  })
})
