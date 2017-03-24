// Copyright (c) Juniper Networks, Inc. All rights reserved.

import './pie-chart.scss'
import _ from 'lodash'
import * as d3Selection from 'd3-selection'
import * as d3Shape from 'd3-shape'
import * as d3Ease from 'd3-ease'
import ContrailChartsView from 'contrail-charts-view'
import actionman from 'core/Actionman'

export default class PieChartView extends ContrailChartsView {
  static get dataType () { return 'Serie' }

  constructor (p = {}) {
    super(p)
    this._highlightRadius = 10
    this.listenTo(this.model, 'change', this.render)
    this.listenTo(this.config, 'change', this.render)
    /**
     * Let's bind super _onResize to this. Also .bind returns new function ref.
     * we need to store this for successful removal from window event
     */
    this._onResize = this._onResize.bind(this)
    window.addEventListener('resize', this._onResize)
  }

  get tagName () { return 'g' }
  /**
   * follow same naming convention for all charts
   */
  get selectors () {
    return _.extend(super.selectors, {
      node: '.arc',
      active: '.active',
    })
  }
  get events () {
    return _.extend(super.events, {
      [`click ${this.selectors.node}`]: '_onClickNode',
      [`mousemove ${this.selectors.node}`]: '_onMousemove',
      [`mouseout ${this.selectors.node}`]: '_onMouseout',
    })
  }

  render () {
    this.resetParams()
    this._calculateDimensions()
    super.render()
    this._onMouseout()
    const serieConfig = this.config.get('serie')
    const radius = this.config.get('radius')
    const data = this.model.data

    const arc = d3Shape.arc()
      .outerRadius(radius)
      .innerRadius(this.config.innerRadius)

    const stakes = d3Shape.pie()
      .sort(null)
      .value(d => serieConfig.getValue(d))(data)

    this.d3.attr('transform', `translate(${this.params.width / 2}, ${this.params.height / 2})`)

    const sectors = this.d3.selectAll(this.selectors.node)
      .data(stakes, d => d.value)

    sectors
      .enter().append('path')
      .classed(this.selectorClass('node'), true)
      .style('fill', d => this.config.getColor(d.data))
      .merge(sectors)
      .classed(this.selectorClass('interactive'), this.config.hasAction('node'))
      .attr('d', arc)
      .transition().ease(d3Ease.easeLinear).duration(this.params.duration)
      .style('fill', d => this.config.getColor(d.data))

    sectors.exit().remove()

    this._ticking = false
  }

  remove () {
    super.remove()
    window.removeEventListener('resize', this._onResize)
  }

  _calculateDimensions () {
    this.params.width = this.config.get('width') || this._container.getBoundingClientRect().width
    if (this.params.widthDelta) this.params.width += this.params.widthDelta
    this.params.height = this.config.get('height') || Math.round(this.params.width / 2)
  }

  _onMousemove (d, el, event) {
    const [left, top] = d3Selection.mouse(this._container)
    el.classList.add(this.selectorClass('active'))
    actionman.fire('ShowComponent', this.config.get('tooltip'), {left, top}, d.data)
  }

  _onMouseout (d, el) {
    actionman.fire('HideComponent', this.config.get('tooltip'))
    const els = el ? this.d3.select(() => el) : this.d3.selectAll(this.selectors.node)
    els.classed('active', false)
  }

  _onClickNode (d, el, e) {
    el.classList.remove(this.selectorClass('active'))
    super._onEvent(d, el, e)
  }
}
