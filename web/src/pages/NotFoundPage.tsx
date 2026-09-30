import { Link } from 'react-router-dom'
import { Icon } from '../shared/components'

export function NotFoundPage() {
  return (
    <div className="notfound">
      <span className="notfound__code t-num">404</span>
      <h1 className="t-headline-sm">Page not found</h1>
      <p className="notfound__text t-body-md">
        The page you are looking for does not exist or is outside your current
        workspace.
      </p>
      <Link to="/" className="btn btn--filled btn--lg state-layer">
        <span className="btn__label">
          <Icon name="home" size={18} style={{ verticalAlign: '-4px', marginRight: 8 }} />
          Back to safety
        </span>
      </Link>
    </div>
  )
}
