import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en.json'

TimeAgo.addDefaultLocale(en)

function App() {
  const startingWhaleLimit = 10
  const [whaleLimit, setWhaleLimit] = useState(startingWhaleLimit)
  const [ethPrice, setEthPrice] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [whaleTransactions, setWhaleTransactions] = useState([])
  const timeAgo = new TimeAgo('en-US')

  const truncate = (str, dynamic = true) => {
    let full = false

    if (dynamic) {
      full = window?.outerWidth >= 768
    }

    return full ? str.slice(0, 5) + '...' + str.slice(-5) : str.slice(0, 6)
  }

  const ethToUsd = (eth, full = false) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: full ? 2 : 0,
    }).format(eth * ethPrice)
  }

  const fetchTransactions = () => {
    console.log(
      'Starting transactions websocket 🔌',
      process.env.REACT_APP_ALCHEMY_WS_URL
    )
    const provider = new ethers.providers.WebSocketProvider(
      process.env.REACT_APP_ALCHEMY_WS_URL
    )

    provider.on('pending', async (tx) => {
      const transaction = await provider.getTransaction(tx)

      if (!transaction) {
        return
      }

      const val = Number(ethers.utils.formatUnits(transaction.value))

      if (Math.round(val) >= startingWhaleLimit) {
        transaction.date = new Date()
        transaction.formattedValue = Math.round(val * 100) / 100

        setTransactions((transactions) => {
          const txs = [...transactions, transaction]
          txs.sort((a, b) => (a.formattedValue < b.formattedValue ? 1 : -1))
          return txs
        })
      }
    })
  }

  const fetchEthPrice = async () => {
    console.log('Fetching eth price ⏳')
    setTimeout(fetchEthPrice, 10000)
    return new Promise(async (resolve) => {
      const res = await fetch(
        'https://data.messari.io/api/v1/assets/eth/metrics'
      )
      const json = await res.json()

      if (json.data.market_data.price_usd) {
        console.log('Setting eth price 📈', json.data.market_data.price_usd)
        setEthPrice(json.data.market_data.price_usd)
        resolve()
      }
    })
  }

  const init = async () => {
    await fetchEthPrice()
    fetchTransactions()
  }

  useEffect(() => {
    setWhaleTransactions(
      transactions.filter((tx) => {
        return tx.formattedValue >= whaleLimit
      })
    )
  }, [whaleLimit, transactions])

  useEffect(init, [])

  return (
    <>
      <main className="w-screen h-screen flex flex-col items-center bg-gray-900 text-gray-50 pb-16 overflow-auto">
        <a
          href="https://www.chambaz.tech/"
          className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2 text-center font-bold">
          Built by <span className="border-b-2">chambaz.eth</span>
        </a>
        <header className="text-center space-y-6 pt-16 md:pt-32 px-4">
          <p className="text-8xl">🐳</p>
          <h1 className="text-6xl font-extrabold">Whale Watching</h1>
        </header>
        <div className="flex flex-col max-w-2xl w-full mx-auto mt-16 px-2">
          <label htmlFor="minValue" className="form-label mb-2">
            <strong>Minimum Value:</strong> {whaleLimit} ETH (
            {ethToUsd(whaleLimit, true)})
          </label>
          <input
            type="range"
            className="form-range before:appearance-none before:w-full before:h-6 before:p-0 before:bg-transparent before:focus:outline-none focus:ring-0 focus:shadow-none"
            min="10"
            max="4000"
            step="10"
            id="minValue"
            value={whaleLimit}
            onChange={(e) => setWhaleLimit(Number(e.target.value))}
          />
        </div>

        <div className="mt-20 mx-4 flex flex-col">
          <div className="-my-2 -mx-4">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                {!whaleTransactions.length && (
                  <p className="text-center">shhh, wait for the whales 🎣</p>
                )}
                {whaleTransactions.length > 0 && (
                  <table className="divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-8"></th>
                        <th
                          scope="col"
                          className="hidden sm:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Tx
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          From
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          To
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:pr-12">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {transactions.map((tx, index) => {
                        if (tx.formattedValue < whaleLimit) {
                          return
                        }

                        return (
                          <tr
                            className={`${
                              index % 2 !== 0 ? 'bg-gray-50' : ''
                            }  text-gray-500 cursor-pointer hover:bg-cyan-50`}
                            key={index}
                            onClick={() => {
                              window.open(`https://etherscan.io/tx/${tx.hash}`)
                            }}>
                            <td className="whitespace-nowrap px-3 py-4 text-xs sm:pl-8">
                              {timeAgo.format(tx.date, 'mini')} ago
                            </td>
                            <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-cyan-700 font-bold">
                              {truncate(tx.hash, false)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {truncate(tx.from)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {truncate(tx.to)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm font-bold sm:pr-12">
                              {tx.formattedValue}Ξ
                              {` (${ethToUsd(tx.formattedValue)})`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default App
