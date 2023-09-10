import React from 'react'
import Modal from '../modal'
import { INSTRUCTIONS } from '../../../lib/Constants'
import styles from './index.module.css'

interface HelpProps{
    onClose: () => void
}
const HelpModal: React.FC<HelpProps> = ({onClose}) => {
    return (
        <Modal onClose={onClose}>
            <ul className={styles['help-container']}>
                {INSTRUCTIONS.map(({key, description}) => (
                    <li className={styles['instruction-text']}>
                        <span className={styles['key-text']}>{key}</span>
                        <span className={styles['description-text']}>{description}</span>
                    </li>
                ))}
            </ul>

        </Modal>
    )
}

export default HelpModal