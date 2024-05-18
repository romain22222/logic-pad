/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

import { createFileRoute } from '@tanstack/react-router'

// Import Routes

import { Route as rootRoute } from './../../routes/__root'
import { Route as IndexImport } from './../../routes/index'
import { Route as LayoutSolveImport } from './../../routes/_layout.solve'
import { Route as LayoutCreateImport } from './../../routes/_layout.create'

// Create Virtual Routes

const LayoutLazyImport = createFileRoute('/_layout')()

// Create/Update Routes

const LayoutLazyRoute = LayoutLazyImport.update({
  id: '/_layout',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./../../routes/_layout.lazy').then((d) => d.Route))

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const LayoutSolveRoute = LayoutSolveImport.update({
  path: '/solve',
  getParentRoute: () => LayoutLazyRoute,
} as any).lazy(() =>
  import('./../../routes/_layout.solve.lazy').then((d) => d.Route),
)

const LayoutCreateRoute = LayoutCreateImport.update({
  path: '/create',
  getParentRoute: () => LayoutLazyRoute,
} as any).lazy(() =>
  import('./../../routes/_layout.create.lazy').then((d) => d.Route),
)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/_layout': {
      preLoaderRoute: typeof LayoutLazyImport
      parentRoute: typeof rootRoute
    }
    '/_layout/create': {
      preLoaderRoute: typeof LayoutCreateImport
      parentRoute: typeof LayoutLazyImport
    }
    '/_layout/solve': {
      preLoaderRoute: typeof LayoutSolveImport
      parentRoute: typeof LayoutLazyImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  LayoutLazyRoute.addChildren([LayoutCreateRoute, LayoutSolveRoute]),
])

/* prettier-ignore-end */
