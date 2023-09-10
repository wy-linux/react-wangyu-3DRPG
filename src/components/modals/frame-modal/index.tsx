import React from 'react'
import Modal from '../modal'
import styles from './index.module.css'

export interface FrameModalProps {
    title: string;
    author: string;
    description: string;
    src: string;
    onClose: () => void
}
const FrameModal: React.FC<FrameModalProps> = ({ 
    title,
    author,
    description,
    src,
    onClose
}) => {
    return (
        <Modal onClose={onClose}>
            <section className={styles['content-text']}>
                <span className={styles['title']}>{title}</span>
                <span className={styles['author']}>{author}</span>
                <p className={styles['description']} dangerouslySetInnerHTML={{ __html: description }} />
            </section>
            <section className={styles['content-img']}>
                <img src={src}/>
            </section>
        </Modal>
    )
}

export default FrameModal