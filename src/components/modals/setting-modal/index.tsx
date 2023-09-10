import React, { useState } from 'react'
import Modal from '../modal'
import styles from './index.module.css'
import { Radio, type RadioChangeEvent } from 'antd'
import { Checkbox } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

interface SettingModalProps {
    isModalShow: boolean;
    onClose: () => void;
    onPersonToggle: () => void;
    onSticksHide: () => void
}
export enum PERSON_STATUS {
    FIRST_PERSON = 1,
    THIRD_PERSON
}

const SettingModal: React.FC<SettingModalProps> = ({ 
    isModalShow, 
    onClose, 
    onPersonToggle,
    onSticksHide
 }) => {
    const [person, setPerson] = useState<PERSON_STATUS>(PERSON_STATUS.THIRD_PERSON)
    const [isStickHide, setIsStickHide] = useState<boolean>(false)
    const onPersonChange = (e: RadioChangeEvent) => {
        setPerson(e.target.value);
        onPersonToggle()
    }
    const onStickChange = (e: CheckboxChangeEvent) => {
        setIsStickHide(e.target.checked)
        onSticksHide()
    }
    return (
        <>
            {isModalShow && (
                <Modal onClose={onClose}>
                    <ul className={styles['setting-container']}>
                        <li className={styles['setting-person']}>
                            <div>切换人称</div>
                            <Radio.Group onChange={onPersonChange} value={person} className={styles['person-group']}>
                                <Radio value={PERSON_STATUS.FIRST_PERSON}>第一人称</Radio>
                                <Radio value={PERSON_STATUS.THIRD_PERSON}>第三人称</Radio>
                            </Radio.Group>
                        </li>
                        <li className={styles['setting-stick']}>
                            <div>虚拟摇杆</div>
                            <Checkbox onChange={onStickChange} checked={isStickHide} className={styles['stick-group']}>
                                隐藏
                            </Checkbox>
                        </li>
                    </ul>
                </Modal>
            )}
        </>
    )
}

export default SettingModal