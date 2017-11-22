/* globals CustomEvent:false */

import './main.scss'

import debounce from 'just-debounce-it'

function buildStoryLink (id) {
  return `https://www.pivotaltracker.com/story/show/${id}`
}

function getProjectData (element) {
  if (/\/workspaces\/\d+\/?$/.test(window.location.href)) {
    const header = element.parents('.panel').find('.panel_header_container')

    return {
      id: parseInt(
        header.find('.panel_header a.velocity').attr('data-project-id')
      ),
      name: header.find('.workspace_header h3').text()
    }
  } else {
    return {
      id: parseInt(window.location.pathname.match(/projects\/(\d+)/)[1]),
      name: document.querySelector('.raw_context_name')
        .textContent
    }
  }
}

function getName (storyElement) {
  const element =
    storyElement.querySelector('.tracker_markup') ||
    storyElement.querySelector('[data-aid="name"]')

  if (!element) return ''

  return element.textContent
}

function getId (storyElement) {
  const element = storyElement.closest('[data-id]')

  if (!element) return ''

  return element.dataset.id
}

function evaluate (code) {
  const script = document.createElement('script')
  script.textContent = `(function() {${code}})()`
  document.body.append(script)
  setTimeout(() => script.remove())
}

function setHarvestPlatformConfig () {
  evaluate(`
    window._harvestPlatformConfig = {
      applicationName: 'PivotalTracker',
      permalink: '${buildStoryLink('%ITEM_ID%')}',
      skipStyling: true
    }
  `)
}

function injectScript (src) {
  const script = document.createElement('script')

  return new Promise(resolve => {
    script.src = src
    script.onload = resolve
    document.body.append(script)
  })
}

function getStoryData (storyElement) {
  const id = getId(storyElement)
  return {
    id,
    name: `${getName(storyElement)} [${buildStoryLink(id)}]`
  }
}

function findButtons (storyElement) {
  return storyElement.querySelector('.state') ||
    storyElement.querySelector('.actions')
}

function createTimerElement (storyElement) {
  const project = getProjectData(storyElement)
  const story = getStoryData(storyElement)

  const timerId = `harvest-${story.id}`

  const existingElement = document.getElementById(timerId)

  if (existingElement) return existingElement

  const timer = document.createElement('span')

  timer.className = 'harvest-timer state button'
  timer.dataset.project = JSON.stringify(project)
  timer.dataset.item = JSON.stringify(story)

  timer.id = timerId

  const buttons = findButtons(storyElement)

  buttons && buttons.append(timer)

  return timer
}

function injectHarvest () {
  return injectScript('https://platform.harvestapp.com/assets/platform.js')
}

function addTimer (timer) {
  const id = timer.id
  evaluate(`
    const harvest = document.getElementById('harvest-messaging')
    const event = new CustomEvent('harvest-event:timers:add', {
      detail: {
        element: document.getElementById('${id}')
      }
    })

    harvest.dispatchEvent(event)
  `)
}

function addTimers () {
  const stories = document.querySelectorAll('.story[data-id]')

  stories.forEach(story => {
    addTimer(createTimerElement(story))
  })
}

const handleClick = debounce(function handleClick (event) {
  addTimers()
}, 500, true)

function addEvents () {
  window.addEventListener('click', handleClick)
}

setHarvestPlatformConfig()

injectHarvest().then(addEvents).then(addTimers)
