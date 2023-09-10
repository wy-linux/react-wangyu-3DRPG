import React from 'react'
import styles from './index.module.css'

interface TipProps {
    title: string;
    tipShow: boolean;
}

const Tip: React.FC<TipProps> = ({ title, tipShow }) => {
    return (
        <div className={styles['tip-container']} style={{opacity: tipShow ? 1 : 0}}>
            <span className={styles['title']}>{title}</span>
            <span className={styles['tip']}>点击此画查看详情</span>
        </div>
    )
}

export default Tip