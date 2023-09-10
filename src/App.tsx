import { useState, useEffect } from 'react'
import { 
    ON_SHOW_TOOLTIP, 
    ON_HIDE_TOOLTIP, 
    ON_LOAD_PROGRESS,
    ON_LOAD_FINISH,
    ON_CLICK_RAY_CAST,
    ON_JOYSTICK_MOVE,
    ON_JUMP_STICK_CLICK,
    ON_KEY_DOWN
} from "./lib/Constants";
import LoadProgress from './components/load-progress';
import Tip from './components/tip'
import FrameModal, {type FrameModalProps} from './components/modals/frame-modal'
import SettingModal from './components/modals/setting-modal'
import HelpModal from './components/modals/help-modal';
import Nipple, { type EventData, type JoystickOutputData } from 'react-nipplejs'
import JumpStick from './components/sticks/jump-stick';
import SettingStick from './components/sticks/setting-stick'
import HelpStick from './components/sticks/help-stick'
import GithubStick from './components/sticks/github-stick';
import Core from "./lib/core"
import styles from './App.module.css'

type ContentProps = Omit<FrameModalProps, 'onClose'>
let core: Core

function App() {
    const [percentState, setPercentState] = useState<number>(0)
    const [loadingTextState, setLoadingTextState] = useState<string>('加载模型中')
    const [isLoadFinish, setIsLoadFinish] = useState<boolean>(false)
    const [isShowProgress, setIsShowProgress] = useState<boolean>(true)
    const [tipTiTle, setTipTitle] = useState<string>('')
    const [isTipShow, setIsTipShow] = useState<boolean>(false)
    const [frameModalContent, setFrameModalContent] = useState<ContentProps>()
    const [isSettingModalShow, setIsSettingModalShow] = useState<boolean>(false)
    const [isHelpModalShow, setIsHelpModalShow] = useState<boolean>(false)
    const [isSticksShow, setIsSticksShow] = useState<boolean>(true)

    const onEnter = () => {
        if (core) {
            core.world.control.enabled();
            core.emitter.$off(ON_LOAD_PROGRESS);
        }
    }
    const onLoadProgress = ([{url, loaded, total}]: [{url: string, loaded: number, total: number}]) => {
    	if (/.*\.(blob|glb|fbx)$/i.test(url)) {
            setPercentState(+(loaded / total * 100).toFixed(2))
    		setLoadingTextState("加载模型中")
    	}
    	if (/.*\.(jpg|png|jpeg)$/i.test(url)) {
            setPercentState(40)
    		setLoadingTextState("加载纹理中")
    	}
    }
    const onLoadFinish = () => {
        setPercentState(100)
        setIsLoadFinish(true)
    }
    const progressClose = () => {
        setIsShowProgress(false)
        onEnter()
    }
    const tipShow = ([{msg}]: [{ msg: string}]) => {
        setTipTitle(msg)
        setIsTipShow(true)
    }
    const tipHide = () => {
        setTipTitle('')
        setIsTipShow(false)
    }
    const frameModalOpen = ([{title, author, description, src}]: [ContentProps]) => {
        setFrameModalContent({title, author, description, src})
    }
    const frameModalClose = () => {
        setFrameModalContent(void 0)
    }
    const settingModalClose = () => {
        setIsSettingModalShow(false)
    }
    const helpModalClose = () => {
        setIsHelpModalShow(false)
    }
    const onPersonToggle = () => {
        core.world.control.key_status['KeyV'] = true
        core.emitter.$emit(ON_KEY_DOWN, 'KeyV');
        //切换完毕，Space=false
        Promise.resolve().then(() => core.world.control.key_status['KeyV'] = false) 
    }
    const joystickMove = (_: EventData, data: JoystickOutputData) => {
        core.emitter.$emit(ON_JOYSTICK_MOVE, data.angle.degree)
    }
    const joystickEnd = () => {
        core.emitter.$emit(ON_JOYSTICK_MOVE, null)
    }
    const JumpStickClick = () => {
        core.emitter.$emit(ON_JUMP_STICK_CLICK, null)
    }
    const settingStickClick = () => {
        setIsSettingModalShow(true)
    }
    const helpStickClick = () => {
        setIsHelpModalShow(true)
    }
    const onSticksHide = () => {
        setIsSticksShow(!isSticksShow)
    }

    useEffect(() => {
        core = new Core()
        core.render()
        core.emitter.$on(ON_LOAD_PROGRESS, onLoadProgress)
        core.emitter.$on(ON_LOAD_FINISH, onLoadFinish)
        core.emitter.$on(ON_SHOW_TOOLTIP, tipShow)
		core.emitter.$on(ON_HIDE_TOOLTIP, tipHide)
        core.emitter.$on(ON_CLICK_RAY_CAST, frameModalOpen);
    }, [])

    return (
        <div className={styles["container"]}>
            <div id="webgl"/>
            {isShowProgress && (
                <LoadProgress
                    isLoadFinish={isLoadFinish} 
                    percent={percentState} 
                    loadingText={loadingTextState}
                    onClose={progressClose}
                />
            )}
            <Tip title={tipTiTle} tipShow={isTipShow}/>
            {isSticksShow && (
                <>
                    <Nipple 
                        className={styles['joystick-nipple']}
                        options={{
                            mode: 'static', 
                            size: 100,
                            color: 'black'
                        }}
                        onMove={joystickMove}
                        onEnd={joystickEnd}
                    />
                    <JumpStick onClick={JumpStickClick}/>
                    <HelpStick onClick={helpStickClick} />
                    <GithubStick />
                </>
            )}
            <SettingStick onClick={settingStickClick}/>
            {frameModalContent && (
                <FrameModal 
                    title={frameModalContent.title}
                    author={frameModalContent.author}
                    description={frameModalContent.description}
                    src={frameModalContent.src}
                    onClose={frameModalClose}
                />
            )}
            <SettingModal 
                isModalShow={isSettingModalShow}
                onClose={settingModalClose}
                onPersonToggle={onPersonToggle}
                onSticksHide={onSticksHide}
            />
            {isHelpModalShow && (
                <HelpModal
                    onClose={helpModalClose}
                />
            )}
        </div>
    );
}

export default App;
