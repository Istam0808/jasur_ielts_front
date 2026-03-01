import "./style.scss"

function Spinner({ size = 'normal' }) {
    const spinnerClass = size === 'compact' ? 'fulfilling-bouncing-circle-spinner spinner-compact' : 'fulfilling-bouncing-circle-spinner';
    
    return (
        <div className={spinnerClass}>
            <div className="circle"></div>
            <div className="orbit"></div>
        </div>
    )
}

export default Spinner;