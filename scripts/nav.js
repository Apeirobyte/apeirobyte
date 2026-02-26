class DropdownMenu {
    constructor(element,hamburgerMenu) {
        this.details = element;
        this.hamburgerMenu = hamburgerMenu;

        this.hamburgerMenu.addEventListener("toggle", () => this.setOpened(false));
        this.details.onmouseenter = () => this.setOpened(true);
        this.details.onmouseleave = () => this.setOpened(false);
    }
    setOpened(value) {
        if(hamburgerMenu.active) return;
        let attributeExists = this.details.attributes.getNamedItem("open");
        if(value) {
            let attribute = document.createAttribute("open");
            this.details.attributes.setNamedItem(attribute);
        } else if(!value && attributeExists)
            this.details.attributes.removeNamedItem("open");
    }
}

class HamburgerMenu extends EventTarget {
    static animations = [
        {// Top
            keyframes: [
                {transform: "translate(36px,10.4565px) rotate(0deg)"},
                {transform: "translate(36px,36px)      rotate(0deg)"},
                {transform: "translate(36px,36px)      rotate(45deg)"},
            ],
            timing: {
                duration: 200,
                easing: "cubic-bezier(0, 0, 0.2, 1)",
                fill: "forwards"
            }
        },
        {// Middle
            keyframes: [
                {transform: "translate(36px,36px)", opacity: 1},
                {transform: "translate(36px,36px)", opacity: 0},
                {transform: "translate(36px,36px)", opacity: 0},
            ],
            timing: {
                duration: 200,
                easing: "cubic-bezier(0, 0, 0.2, 1)",
                fill: "forwards"
            }
        },
        {// Bottom
            keyframes: [
                {transform: "translate(36px,61.544px) rotate(0deg)"},
                {transform: "translate(36px,36px)     rotate(0deg)"},
                {transform: "translate(36px,36px)     rotate(-45deg)"},
            ],
            timing: {
                duration: 200,
                easing: "cubic-bezier(0, 0, 0.2, 1)",
                fill: "forwards"
            }
        },
    ];
    constructor(navigation) {
        super();
        this.active = false;
        this.button = navigation.querySelector("#hamburgerIcon");
        this.items = navigation.querySelector("#hamburgerItems");
        this.queuedAnimations = [];

        this.skipAnimation();
        this.button.onclick = () => this.toggle();
        window.addEventListener("resize", () => {
            if(window.innerWidth > 735 && this.active) this.toggle();
        })
    }
    skipAnimation() {
        for(let index in this.queuedAnimations)
            clearTimeout(this.queuedAnimations[index]);
        this.queuedAnimations = [];
        this.button.getAnimations().forEach(animation => {
            if(!animation.finished) animation.finish();
        });
        this.button.querySelectorAll("rect").forEach((element,index) => {
            for(let [key,value] of Object.entries(HamburgerMenu.animations[index].keyframes.at(-this.active)))
                element.style[key] = value;
        });
    }
    toggle() {
        this.skipAnimation();
        this.active = !this.active;
        this.dispatchEvent(new Event("toggle"));
        let attributeExists = this.items.attributes.getNamedItem("open");
        if(this.active) {
            let attribute = document.createAttribute("open");
            this.items.attributes.setNamedItem(attribute);
        } else if(!this.active && attributeExists)
            this.items.attributes.removeNamedItem("open");
        this.button.querySelectorAll("rect").forEach((element,index) => {
            let animation = HamburgerMenu.animations[index];
            for(let i = 0; i < animation.keyframes.length - 1; i++) {
                let timeoutId = setTimeout(() => {
                    this.queuedAnimations = this.queuedAnimations.filter(id => id != timeoutId);
                    let direction = array => this.active ? array: array.toReversed() ;
                    let keyframes = direction(animation.keyframes).slice(i,i+2);
                    element.animate(keyframes,animation.timing);
                }, i*animation.timing.duration);
                this.queuedAnimations.push(timeoutId);
            }
        });
    }
}

let hamburgerMenu = new HamburgerMenu(document.querySelector("header nav"));
document.querySelectorAll(".dropdown").forEach(element => new DropdownMenu(element,hamburgerMenu));