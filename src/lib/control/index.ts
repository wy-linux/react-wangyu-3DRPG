import { 
    ON_KEY_DOWN, 
    ON_KEY_UP, 
    ON_JOYSTICK_MOVE, 
    ON_JUMP_STICK_CLICK
} from "../Constants";
import Emitter from "../emitter";

type Keys = "KeyW" | "KeyS" | "KeyA" | "KeyD" | "KeyV" | "KeyF" | "Space";
type KeySets = Keys[]
type KeyStatus = {
	[key in Keys]: boolean;
}
interface ControlParams {
	emitter: Emitter;
}

export default class Control {
	private emitter: Emitter;
    is_enabled =  false;
	key_status: KeyStatus = {
		"KeyW": false,
		"KeyS": false,
		"KeyA": false,
		"KeyD": false,
		"KeyV": false,
		"KeyF": false,
		"Space": false
	};
    degree: number | null = null;
	private key_sets: KeySets = ["KeyW", "KeyS", "KeyA", "KeyD", "KeyV", "KeyF", "Space"];

	constructor({
		emitter
	}: ControlParams) {
		this.emitter = emitter;
        document.addEventListener("keydown", this.onKeyDown.bind(this));
		document.addEventListener("keyup", this.onKeyUp.bind(this));
        //处理摇杆事件
        this.emitter.$on(ON_JOYSTICK_MOVE, this.onJoystickMove.bind(this))
        this.emitter.$on(ON_JUMP_STICK_CLICK, this.onJumpStickClick.bind(this))
	}
	private onKeyDown(event: KeyboardEvent) {
		if (this.isAllowKey(event.code) && this.is_enabled) {
			this.key_status[event.code] = true;
			this.emitter.$emit(ON_KEY_DOWN, event.code);
		}
	}
    
	private onKeyUp(event: KeyboardEvent) {
		if (this.isAllowKey(event.code) && this.is_enabled) {
			this.key_status[event.code] = false;
			this.emitter.$emit(ON_KEY_UP, event.code);
		}
	}

    private onJoystickMove([degree]: [number | null]) {
        this.degree = degree
    }

    private onJumpStickClick() {
        this.key_status['Space'] = true;
        this.emitter.$emit(ON_KEY_DOWN, 'Space');
        //点击完毕，Space=false
        Promise.resolve().then(() => this.key_status['Space'] = false) 
    }

	isAllowKey(key: string): key is Keys {
		return this.key_sets.includes(key as Keys);
	}

	resetStatus() {
		for (const key of this.key_sets) {
			this.key_status[key] = false;
		}
	}

    disabled() {
		this.is_enabled = false;
	}

	enabled() {
		this.is_enabled = true;
	}
}
