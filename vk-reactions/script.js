var window = globalThis.window
var document = window.document
var reactions = null

// Allowed stickers for reaction animation
const sticker_ids = []

/**
 * Load bodymovin lib and get lottie json data
 * @param {Parameters<ConstructorParameters<PromiseConstructor>[0]>[0]} resolve
 * @param {Parameters<ConstructorParameters<PromiseConstructor>[0]>[1]} reject
 */
const setupScript = (resolve, reject) => {
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"
  script.setAttribute("crossorigin", "anonymous")

  script.onload = async () => {
    // https://dev.vk.com/ru/method/messages.getReactionsAssets
    const response = await App.httpGet("reactions.json")

    const data = JSON.parse(response.body)
    resolve(data.response)
  }

  script.onerror = (ev) => {
    reject(ev)
  }

  document.body.appendChild(script)
}

class Overlay {
  /**
   * @type {HTMLDivElement}
   */
  element

  /**
   * Delay in waiting for the hiding animation
   * @type {number}
   */
  hidingDelay

  constructor(hidingDelay = 250) {
    this.hidingDelay = hidingDelay

    this.element = document.createElement("div")
    this.element.style.top = "0"
    this.element.style.width = "100%"
    this.element.style.height = "100%"
    this.element.style.position = "absolute"
    this.element.style.pointerEvents = "none"
    this.element.style.zIndex = "1000"
    this.element.style.transition = "opacity 0.25s"
    this.element.classList.add("lottie")
  }

  /**
   * Playing the lottie animation
   * @param {string} url
   */
  playAnimation(url) {
    if (!this.element) {
      return
    }

    const animation = window.bodymovin.loadAnimation({
      container: this.element,
      path: url,
      renderer: "svg",
      loop: false,
      autoplay: false,
    })

    animation.play()
  }

  /**
   * Async hiding an overlay with a delay
   */
  async hideOverlay() {
    if (!this.element) {
      return
    }

    await new Promise((resolve) => {
      setTimeout(() => {
        this.element.style.opacity = "0"
        resolve(undefined)
      }, this.hidingDelay)
    })
  }

  /**
   * Removes the overlay
   */
  removeOverlay() {
    this.element.remove()
  }
}

Stickers.onPin = async (task, sticker, value) => {
  if (!sticker_ids.includes(sticker.id)) {
    return
  }

  if (!window.bodymovin) {
    reactions = await new Promise(setupScript)
  }

  const entity = sticker.box.get(sticker.id)
  const mappedValue = entity.states.index[value]?.name

  if (reactions && reactions.assets[mappedValue]) {
    const lottie_json = reactions.assets[mappedValue].links.small_animation

    task.ui.refresh()
    const parent = task.ui.getElement().parentElement
    const isContainerAlreadyExist = parent.querySelector(".lottie")

    if (isContainerAlreadyExist) {
      isContainerAlreadyExist.remove()
    }

    const container = new Overlay()
    parent.appendChild(container.element)

    container.playAnimation(lottie_json)

    setTimeout(async () => {
      await container.hideOverlay()
      container.removeOverlay()
    }, 2000)
  }
}
