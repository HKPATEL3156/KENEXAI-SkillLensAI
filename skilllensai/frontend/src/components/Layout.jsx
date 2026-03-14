import Navbar from "./Navbar"
import Footer from "./Footer"

const Layout = ({ children, isLanding }) => {
  return (
    <>
      <Navbar isLanding={isLanding} />
      <div className="pt-24">{children}</div>
      <Footer />
    </>
  )
}

export default Layout
