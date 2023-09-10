import React from 'react'
import { Progress, Button, Spin} from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import logo from '../../assets/logo.png'
import styles from './index.module.css'

interface ProgressProps {
    percent: number;
    loadingText: string;
    isLoadFinish: boolean;
    onClose: () => void;
}

const LoadProgress: React.FC<ProgressProps> = ({ 
    percent, 
    loadingText, 
    isLoadFinish,
    onClose
}) => {
    return (
        <div className={styles['progress-container']}>
            <div className={styles['progress-title']}>
                <img src={logo} alt="WangYu-3DRPG" />
                <h1>WangYu-3DRPG</h1>
            </div>
            <Progress 
                type="circle" 
                percent={percent} 
                trailColor="#000"
                strokeColor="#fff"
            />
            {isLoadFinish ? (
                <div className={styles['finish-box']}>
                    <span className={styles['finish-text']}>
                        PC端访问渲染效果更佳，Mobile端使用虚拟摇杆操作
                    </span>
                    <Button type="primary" onClick={onClose}>进入</Button>
                </div>
            ): (
                <div className={styles['loading-box']}>
                    <span className={styles['text']}>{loadingText}</span>
                    <Spin indicator={<LoadingOutlined />} />
                </div>  
            )}
        </div>
    )
}

export default LoadProgress