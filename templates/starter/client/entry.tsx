import { createRoot } from 'react-dom/client'

import { FileRouter } from '@dex/router/client'

import { routes } from '../dex/.generated/routes'
import { layouts } from '../dex/.generated/layouts'

import GlobalLayout from '../web/layouts/global'

const el = document.getElementById('root')
if (!el) throw new Error('Missing <div id="root"></div>')

createRoot(el).render(
	<FileRouter routes={routes} layouts={layouts} GlobalLayout={GlobalLayout} />
)
