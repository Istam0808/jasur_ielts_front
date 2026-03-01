import "./styles.scss"

function Particle(props) {
    const { position } = props;

    // position:  top-left, top-right, bottom-left, bottom-right

    return (
        <div className={`accent-shape ${position}`}>
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path fill="#f0f0f0" d="M100,0 L200,100 L100,200 L0,100 Z" />
            </svg>
        </div>
    );
}

export default Particle;