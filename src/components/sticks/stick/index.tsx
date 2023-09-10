import React from 'react'
import styles from './index.module.css'

interface StickProps {
    children: React.ReactNode;
    className: string;
    onClick?: () => void
}

const Stick: React.FC<StickProps> = ({ 
    children, 
    className, 
    onClick
}) => {
    return (
        <div 
            className={`${styles['stick-container']} ${className}`} 
            onTouchStart={onClick}
            onClick={onClick}
        >
            {children}
        </div>
    )
}

export default Stick